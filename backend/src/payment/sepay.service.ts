import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import {
  BookingStatus,
  PaymentRecordStatus,
  PaymentStatus,
} from '../../generated/prisma/enums';
import { BOOKING_DEPOSIT_VND, balanceDueVnd } from '../common/booking-payment';
import { normalizePhone } from '../common/normalize-phone';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from './payment.service';
import { TelegramBookingNotificationService } from './telegram-booking-notification';
import {
  buildTransferContent,
  collectStringsFromWebhookPayload,
  collectWebhookSearchTexts,
  compactPaymentRef,
  extractAllBookingCodesFromTransferText,
  normalizeSePayPaymentCode,
} from './sepay-transfer';

export type SePayWebhookBody = {
  id: number | string;
  code?: string | null;
  content?: string | null;
  transferType?: string;
  transferAmount?: number | string;
  referenceCode?: string | null;
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
};

@Injectable()
export class SepayService {
  private readonly logger = new Logger(SepayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly telegramNotification: TelegramBookingNotificationService,
  ) {}

  private bankConfig() {
    const bin = process.env.SEPAY_BANK_BIN;
    const account = process.env.SEPAY_BANK_ACCOUNT;
    const accountName = process.env.SEPAY_ACCOUNT_NAME ?? '';
    const bankName = process.env.SEPAY_BANK_NAME ?? 'Ngân hàng';
    if (!bin || !account) {
      throw new BadRequestException(
        'Chưa cấu hình SEPAY_BANK_BIN và SEPAY_BANK_ACCOUNT',
      );
    }
    return { bin, account, accountName, bankName };
  }

  private normalizeEnvValue(value: string | undefined) {
    return value?.trim().replace(/^["']|["']$/g, '') ?? '';
  }

  private webhookKeyMatches(provided: string, expected: string) {
    const candidates = [
      provided.trim(),
      provided.replace(/^Apikey\s+/i, '').replace(/^Bearer\s+/i, '').trim(),
    ];
    return candidates.some((candidate) => {
      if (!candidate || candidate.length !== expected.length) return false;
      return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
    });
  }

  private verifyWebhookAuth(
    headers: Record<string, string | string[] | undefined>,
    queryApiKey?: string,
  ) {
    const expected = this.normalizeEnvValue(process.env.SEPAY_WEBHOOK_API_KEY);
    if (!expected) {
      return;
    }

    const headerValues = [
      headers.authorization,
      headers.Authorization,
      headers['x-api-key'],
      headers['X-Api-Key'],
    ].flatMap((value) => {
      if (Array.isArray(value)) return value;
      return value ? [value] : [];
    });

    const provided = [...headerValues, queryApiKey ?? ''].filter((value) =>
      Boolean(value?.trim()),
    );

    if (provided.some((value) => this.webhookKeyMatches(value, expected))) {
      return;
    }

    this.logger.warn(
      `[sepay] Webhook auth failed (authorization=${Boolean(headers.authorization || headers.Authorization)}, x-api-key=${Boolean(headers['x-api-key'] || headers['X-Api-Key'])}, query=${Boolean(queryApiKey?.trim())}, expectedKeyLen=${expected.length})`,
    );
    throw new UnauthorizedException('Webhook không hợp lệ');
  }

  buildQrImageUrl(amount: number, transferContent: string): string {
    const { bin, account, accountName } = this.bankConfig();
    const params = new URLSearchParams({
      amount: String(amount),
      addInfo: transferContent,
    });
    if (accountName) {
      params.set('accountName', accountName);
    }
    return `https://img.vietqr.io/image/${bin}-${account}-compact2.png?${params.toString()}`;
  }

  /** QR chuyển khoản chung (không gắn đơn) — hiển thị trang chủ khách. */
  getPublicBankInfo() {
    const { bin, account, accountName, bankName } = this.bankConfig();
    const params = new URLSearchParams();
    if (accountName) {
      params.set('accountName', accountName);
    }
    const qs = params.toString();
    return {
      bankName,
      accountNumber: account,
      accountName,
      qrImageUrl: `https://img.vietqr.io/image/${bin}-${account}-compact2.png${qs ? `?${qs}` : ''}`,
    };
  }

  async getPaymentInstructions(bookingId: string, phoneRaw: string) {
    const phone = normalizePhone(phoneRaw);
    if (phone.length < 9) {
      throw new BadRequestException('Số điện thoại không hợp lệ');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { select: { phone: true } },
        payment: true,
        camera: { select: { id: true } },
      },
    });
    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn');
    }
    if (normalizePhone(booking.customer.phone) !== phone) {
      throw new ForbiddenException('Không có quyền xem đơn này');
    }

    if (booking.paymentStatus === PaymentStatus.PAID) {
      return {
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        cameraId: booking.camera.id,
        amount: 0,
        totalAmount: booking.amount,
        depositAmount: BOOKING_DEPOSIT_VND,
        balanceDue: 0,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        paymentKind: 'DEPOSIT' as const,
        alreadyPaid: true,
        shippingAddress: booking.shippingAddress,
      };
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      const balanceDue = balanceDueVnd(booking.amount);
      return {
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        cameraId: booking.camera.id,
        amount: balanceDue,
        totalAmount: booking.amount,
        depositAmount: BOOKING_DEPOSIT_VND,
        balanceDue,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        paymentKind: 'DEPOSIT_DONE' as const,
        alreadyPaid: false,
        depositPaid: true,
        shippingAddress: booking.shippingAddress,
      };
    }

    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        'Đơn không ở trạng thái chờ cọc',
      );
    }

    const { bin, account, accountName, bankName } = this.bankConfig();
    const transferContent = buildTransferContent(booking.bookingCode);
    const payAmount = BOOKING_DEPOSIT_VND;

    let payment = booking.payment;
    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          bookingId: booking.id,
          provider: 'SEPAY',
          amount: payAmount,
          status: PaymentRecordStatus.PENDING,
          providerTxnRef: booking.bookingCode,
        },
      });
    } else if (
      payment.amount !== payAmount ||
      payment.status !== PaymentRecordStatus.PENDING
    ) {
      payment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          provider: 'SEPAY',
          amount: payAmount,
          providerTxnRef: booking.bookingCode,
          status: PaymentRecordStatus.PENDING,
        },
      });
    }

    return {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      cameraId: booking.camera.id,
      amount: payAmount,
      totalAmount: booking.amount,
      depositAmount: BOOKING_DEPOSIT_VND,
      balanceDue: balanceDueVnd(booking.amount),
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentKind: 'DEPOSIT' as const,
      alreadyPaid: false,
      bankName,
      accountNumber: account,
      accountName,
      bankBin: bin,
      transferContent,
      qrImageUrl: this.buildQrImageUrl(payAmount, transferContent),
      paymentId: payment.id,
      shippingAddress: booking.shippingAddress,
    };
  }

  private parseAmount(value: number | string | undefined): number | null {
    if (value === undefined || value === null) return null;
    const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
    return Number.isFinite(n) ? Math.round(n) : null;
  }

  private paymentMatchesText(
    payment: { providerTxnRef: string; booking: { bookingCode: string } },
    raw: string,
  ): boolean {
    const compact = compactPaymentRef(raw);
    const refs = [payment.providerTxnRef, payment.booking.bookingCode];
    return refs.some((ref) => {
      const refCompact = compactPaymentRef(ref);
      if (!refCompact) return false;
      return (
        compact.includes(refCompact) ||
        raw.toUpperCase().includes(ref.toUpperCase())
      );
    });
  }

  private webhookMatchTexts(body: SePayWebhookBody): string[] {
    // Không đưa mã thanh toán cụt (DH+ngày) vào fuzzy match — dễ khớp nhầm nhiều đơn cùng ngày.
    const paymentCode = normalizeSePayPaymentCode(body.code);
    const preferred = [paymentCode, body.content, body.referenceCode]
      .map((s) => s?.trim())
      .filter((s): s is string => !!s);
    const fromPayload = collectStringsFromWebhookPayload({
      content: body.content,
      referenceCode: body.referenceCode,
      description: (body as { description?: string | null }).description,
    });
    return collectWebhookSearchTexts([...preferred, ...fromPayload]);
  }

  private async listMatchablePayments() {
    return this.prisma.payment.findMany({
      where: {
        provider: 'SEPAY',
        status: {
          in: [PaymentRecordStatus.PENDING, PaymentRecordStatus.FAILED],
        },
        booking: { status: BookingStatus.PENDING_PAYMENT },
      },
      include: { booking: true },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  private pickPaymentByBookingCode<
    T extends {
      id: string;
      bookingId: string;
      providerTxnRef: string;
      booking: { bookingCode: string };
    },
  >(payments: T[], bookingCode: string): T | null {
    const normalized = bookingCode.trim().toUpperCase();
    const compact = compactPaymentRef(normalized);
    return (
      payments.find((payment) => {
        const codes = [
          payment.providerTxnRef,
          payment.booking.bookingCode,
        ].map((value) => value.trim().toUpperCase());
        return (
          codes.includes(normalized) ||
          codes.some((code) => compactPaymentRef(code) === compact)
        );
      }) ?? null
    );
  }

  /**
   * Khớp giao dịch SePay với payment đang chờ cọc.
   * 1) `code` (Mã thanh toán) nếu ĐỦ hậu tố — so trực tiếp với bookingCode đã lưu
   * 2) Trích DH-YYYYMMDD-XXXX từ nội dung CK (bỏ CT DEN / IBFT / SEVQR)
   * 3) Fuzzy: compact mã đơn nằm trong nội dung
   */
  private async findPaymentForWebhook(body: SePayWebhookBody) {
    const matchable = await this.listMatchablePayments();
    if (matchable.length === 0) return null;

    const fromSePayCode = normalizeSePayPaymentCode(body.code);
    if (fromSePayCode) {
      const byPaymentCode = this.pickPaymentByBookingCode(matchable, fromSePayCode);
      if (byPaymentCode) {
        this.logger.log(
          `[sepay] Khớp theo Mã thanh toán (code=${fromSePayCode}) → booking ${byPaymentCode.booking.bookingCode}`,
        );
        return byPaymentCode;
      }
    } else if (body.code?.trim()) {
      this.logger.warn(
        `[sepay] Bỏ qua Mã thanh toán cụt/không hợp lệ: "${body.code.trim()}" — cần đủ dạng DH+YYYYMMDD+hậu tố`,
      );
    }

    const texts = this.webhookMatchTexts(body);
    const extractedCodes = new Set<string>();
    for (const text of texts) {
      for (const code of extractAllBookingCodesFromTransferText(text)) {
        extractedCodes.add(code);
      }
    }

    for (const bookingCode of extractedCodes) {
      const byCode = this.pickPaymentByBookingCode(matchable, bookingCode);
      if (byCode) {
        this.logger.log(
          `[sepay] Khớp theo nội dung CK (extracted=${bookingCode}) → booking ${byCode.booking.bookingCode}`,
        );
        return byCode;
      }
    }

    for (const text of texts) {
      for (const payment of matchable) {
        if (this.paymentMatchesText(payment, text)) {
          this.logger.log(
            `[sepay] Khớp fuzzy content → booking ${payment.booking.bookingCode}`,
          );
          return payment;
        }
      }
    }

    return null;
  }

  private depositAmountMatches(
    transferAmount: number | null,
    expected: number,
  ): boolean {
    if (transferAmount === null) return true;
    return transferAmount >= expected;
  }

  async handleWebhook(
    body: SePayWebhookBody,
    headers: Record<string, string | string[] | undefined>,
    queryApiKey?: string,
  ) {
    this.verifyWebhookAuth(headers, queryApiKey);

    if (
      body.transferType &&
      String(body.transferType).trim().toLowerCase() !== 'in'
    ) {
      return { success: true };
    }

    const externalId = String(body.id ?? '');
    const payment = await this.findPaymentForWebhook(body);
    if (!payment) {
      const texts = this.webhookMatchTexts(body);
      const codes = [
        normalizeSePayPaymentCode(body.code),
        ...texts.flatMap((text) => extractAllBookingCodesFromTransferText(text)),
      ].filter(Boolean);
      this.logger.warn(
        `[sepay] Webhook ${externalId || 'unknown'}: không khớp payment (sepayCode=${body.code ?? 'null'}; codes=${codes.join(',') || 'none'}; content=${texts.join(' | ').slice(0, 180)})`,
      );
      return { success: true };
    }

    if (
      payment.status === PaymentRecordStatus.SUCCESS ||
      payment.externalTransId === externalId
    ) {
      return { success: true };
    }

    const transferAmount = this.parseAmount(body.transferAmount);
    if (!this.depositAmountMatches(transferAmount, payment.amount)) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentRecordStatus.FAILED,
          rawPayload: body as object,
          externalTransId: externalId,
        },
      });
      return { success: true };
    }

    const ok = await this.paymentService.confirmBookingAfterPayment(
      payment.bookingId,
    );

    if (ok) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentRecordStatus.SUCCESS,
          rawPayload: body as object,
          externalTransId: externalId,
        },
      });
      const booking = await this.prisma.booking.findUnique({
        where: { id: payment.bookingId },
        include: { customer: true, camera: true },
      });
      if (booking) {
        try {
          await this.telegramNotification.notifyNewDeposit({
            customer: booking.customer,
            camera: booking.camera,
            pickupAt: booking.pickupAt ?? booking.startBookingDate,
            note: booking.note,
          });
        } catch (error) {
          console.error('[telegram] Failed to send new-booking notification', error);
        }
      }
      return { success: true };
    }

    // Tiền đã vào TK nhưng chưa confirm được đơn — trả 503 để SePay retry webhook.
    this.logger.warn(
      `[sepay] Webhook ${externalId}: đã khớp payment ${payment.id} nhưng không confirm booking ${payment.bookingId}`,
    );
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentRecordStatus.PENDING,
        rawPayload: body as object,
      },
    });

    throw new ServiceUnavailableException(
      'Đã nhận tiền nhưng chưa giữ được chỗ — thử lại sau',
    );
  }
}
