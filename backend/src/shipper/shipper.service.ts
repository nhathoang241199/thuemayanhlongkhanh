import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { randomUUID } from 'crypto';
import { hashPassword, verifyPassword } from '../common/password-hash';
import { normalizePhone } from '../common/normalize-phone';
import {
  ALLOWED_VERIFICATION_MIMES,
  MAX_PAYOUT_QR_BYTES,
  payoutQrUploadDiskPath,
  payoutQrUploadPublicUrl,
  verificationImageExtension,
} from '../common/upload-config';
import { PrismaService } from '../prisma/prisma.service';

export type ShipperView = {
  id: string;
  phone: string;
  name: string;
  active: boolean;
  balanceVnd: number;
  payoutQrUrl: string;
  payoutRequestedAt: string | null;
  messengerPsid: string;
  createdAt: string;
  updatedAt: string;
};

export type ShipperWithdrawalView = {
  id: string;
  shipperId: string;
  amountVnd: number;
  note: string | null;
  createdAt: string;
};

@Injectable()
export class ShipperService {
  constructor(private readonly prisma: PrismaService) {}

  toView(row: {
    id: string;
    phone: string;
    name: string;
    active: boolean;
    balanceVnd: number;
    payoutQrUrl?: string;
    payoutRequestedAt?: Date | null;
    messengerPsid?: string;
    createdAt: Date;
    updatedAt: Date;
  }): ShipperView {
    return {
      id: row.id,
      phone: row.phone,
      name: row.name,
      active: row.active,
      balanceVnd: row.balanceVnd,
      payoutQrUrl: row.payoutQrUrl?.trim() ?? '',
      payoutRequestedAt: row.payoutRequestedAt?.toISOString() ?? null,
      messengerPsid: row.messengerPsid?.trim() ?? '',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async findAll(): Promise<ShipperView[]> {
    const rows = await this.prisma.shipper.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows
      .map((row) => this.toView(row))
      .sort((a, b) => {
        if (Boolean(a.payoutRequestedAt) !== Boolean(b.payoutRequestedAt)) {
          return a.payoutRequestedAt ? -1 : 1;
        }
        if (a.payoutRequestedAt && b.payoutRequestedAt) {
          return (
            new Date(a.payoutRequestedAt).getTime() -
            new Date(b.payoutRequestedAt).getTime()
          );
        }
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }

  async findNameById(id: string): Promise<string | null> {
    const row = await this.prisma.shipper.findUnique({
      where: { id },
      select: { name: true },
    });
    return row?.name ?? null;
  }

  async findSessionById(id: string): Promise<{
    name: string;
    balanceVnd: number;
    payoutQrUrl: string;
    payoutRequestedAt: string | null;
  } | null> {
    const row = await this.prisma.shipper.findUnique({
      where: { id },
      select: {
        name: true,
        balanceVnd: true,
        payoutQrUrl: true,
        payoutRequestedAt: true,
      },
    });
    if (!row) return null;
    return {
      name: row.name,
      balanceVnd: row.balanceVnd,
      payoutQrUrl: row.payoutQrUrl?.trim() ?? '',
      payoutRequestedAt: row.payoutRequestedAt?.toISOString() ?? null,
    };
  }

  async requestPayout(shipperId: string): Promise<ShipperView> {
    const existing = await this.prisma.shipper.findUnique({
      where: { id: shipperId },
    });
    if (!existing) throw new NotFoundException('Không tìm thấy shipper');
    if (!existing.active) {
      throw new BadRequestException('Tài khoản shipper không hoạt động');
    }
    if (existing.balanceVnd <= 0) {
      throw new BadRequestException('Số dư bằng 0 — chưa thể rút');
    }
    if (existing.payoutRequestedAt) {
      return this.toView(existing);
    }
    const row = await this.prisma.shipper.update({
      where: { id: shipperId },
      data: { payoutRequestedAt: new Date() },
    });
    return this.toView(row);
  }

  /**
   * Gắn Messenger PSID khi shipper nhắn fanpage: `SHIP <SĐT>`.
   * Trả về message tiếng Việt để bot reply.
   */
  async linkMessengerPsid(
    phoneRaw: string,
    psid: string,
  ): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
    const phone = normalizePhone(phoneRaw);
    const trimmedPsid = psid.trim();
    if (!trimmedPsid) {
      return { ok: false, message: 'Không lấy được PSID Messenger.' };
    }
    if (phone.length < 9) {
      return {
        ok: false,
        message: 'SĐT không hợp lệ. Gửi: SHIP 0901234567',
      };
    }

    const shipper = await this.prisma.shipper.findUnique({ where: { phone } });
    if (!shipper) {
      return {
        ok: false,
        message: `Không tìm thấy shipper SĐT ${phone}. Nhờ shop tạo tài khoản trước.`,
      };
    }
    if (!shipper.active) {
      return {
        ok: false,
        message: 'Tài khoản shipper đang tắt. Liên hệ shop.',
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.shipper.updateMany({
        where: { messengerPsid: trimmedPsid, NOT: { id: shipper.id } },
        data: { messengerPsid: '' },
      });
      await tx.shipper.update({
        where: { id: shipper.id },
        data: { messengerPsid: trimmedPsid },
      });
    });

    return {
      ok: true,
      message: 'Liên kết thông báo đơn thành công!',
    };
  }

  async unlinkMessengerByPsid(
    psid: string,
  ): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
    const trimmedPsid = psid.trim();
    if (!trimmedPsid) {
      return { ok: false, message: 'Không lấy được PSID Messenger.' };
    }
    const result = await this.prisma.shipper.updateMany({
      where: { messengerPsid: trimmedPsid },
      data: { messengerPsid: '' },
    });
    if (result.count === 0) {
      return {
        ok: false,
        message: 'Messenger này chưa gắn shipper nào. Gửi: SHIP 0901234567',
      };
    }
    return {
      ok: true,
      message: 'Đã huỷ gắn Messenger. Bạn sẽ không nhận tin đơn ship nữa.',
    };
  }

  async clearMessengerPsid(shipperId: string): Promise<ShipperView> {
    const existing = await this.prisma.shipper.findUnique({
      where: { id: shipperId },
    });
    if (!existing) throw new NotFoundException('Không tìm thấy shipper');
    const row = await this.prisma.shipper.update({
      where: { id: shipperId },
      data: { messengerPsid: '' },
    });
    return this.toView(row);
  }

  async uploadPayoutQr(
    shipperId: string,
    file: Express.Multer.File,
  ): Promise<ShipperView> {
    const existing = await this.prisma.shipper.findUnique({
      where: { id: shipperId },
    });
    if (!existing) throw new NotFoundException('Không tìm thấy shipper');
    if (!file?.buffer?.length) {
      throw new BadRequestException('Thiếu file QR.');
    }
    if (file.size > MAX_PAYOUT_QR_BYTES) {
      throw new BadRequestException('Ảnh QR tối đa 3 MB.');
    }
    if (!ALLOWED_VERIFICATION_MIMES.has(file.mimetype)) {
      throw new BadRequestException('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.');
    }
    const ext = verificationImageExtension(file.mimetype);
    if (!ext) {
      throw new BadRequestException('Định dạng ảnh không hỗ trợ.');
    }

    const filename = `payout-qr-${randomUUID()}${ext}`;
    const diskPath = payoutQrUploadDiskPath(shipperId, filename);
    await mkdir(dirname(diskPath), { recursive: true });
    await writeFile(diskPath, file.buffer);

    const row = await this.prisma.shipper.update({
      where: { id: shipperId },
      data: { payoutQrUrl: payoutQrUploadPublicUrl(shipperId, filename) },
    });
    return this.toView(row);
  }

  async confirmPayout(shipperId: string): Promise<ShipperView> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.shipper.findUnique({ where: { id: shipperId } });
      if (!existing) throw new NotFoundException('Không tìm thấy shipper');
      if (existing.balanceVnd <= 0) {
        throw new BadRequestException('Số dư bằng 0');
      }
      const amountVnd = existing.balanceVnd;
      await tx.shipper.update({
        where: { id: shipperId },
        data: { balanceVnd: 0, payoutRequestedAt: null },
      });
      await tx.shipperWithdrawal.create({
        data: {
          shipperId,
          amountVnd,
          note: existing.payoutRequestedAt
            ? 'Xác nhận thanh toán (sau yêu cầu rút)'
            : 'Xác nhận thanh toán',
        },
      });
      const row = await tx.shipper.findUniqueOrThrow({ where: { id: shipperId } });
      return this.toView(row);
    });
  }

  async create(input: {
    phone: string;
    name: string;
    password: string;
  }): Promise<ShipperView> {
    const phone = normalizePhone(input.phone);
    if (phone.length < 9) {
      throw new BadRequestException('Số điện thoại không hợp lệ');
    }
    const name = input.name.trim();
    if (!name) throw new BadRequestException('Tên shipper là bắt buộc');
    if (!input.password || input.password.length < 6) {
      throw new BadRequestException('Mật khẩu tối thiểu 6 ký tự');
    }

    const existing = await this.prisma.shipper.findUnique({ where: { phone } });
    if (existing) {
      throw new ConflictException('SĐT shipper đã tồn tại');
    }

    const row = await this.prisma.shipper.create({
      data: {
        phone,
        name,
        passwordHash: hashPassword(input.password),
      },
    });
    return this.toView(row);
  }

  async update(
    id: string,
    input: {
      name?: string;
      password?: string;
      active?: boolean;
      clearMessengerPsid?: boolean;
    },
  ): Promise<ShipperView> {
    const existing = await this.prisma.shipper.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy shipper');

    const data: {
      name?: string;
      passwordHash?: string;
      active?: boolean;
      messengerPsid?: string;
    } = {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new BadRequestException('Tên shipper là bắt buộc');
      data.name = name;
    }
    if (input.password !== undefined && input.password.trim()) {
      if (input.password.length < 6) {
        throw new BadRequestException('Mật khẩu tối thiểu 6 ký tự');
      }
      data.passwordHash = hashPassword(input.password);
    }
    if (input.active !== undefined) {
      data.active = input.active;
    }
    if (input.clearMessengerPsid) {
      data.messengerPsid = '';
    }

    const row = await this.prisma.shipper.update({ where: { id }, data });
    return this.toView(row);
  }

  async remove(id: string): Promise<{ ok: true }> {
    const existing = await this.prisma.shipper.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy shipper');

    const claimedCount = await this.prisma.shipOrder.count({
      where: { shipperId: id, status: 'CLAIMED' },
    });
    if (claimedCount > 0) {
      throw new BadRequestException(
        'Shipper đang có đơn chưa giao xong. Hoàn thành hoặc huỷ nhận đơn trước khi xoá.',
      );
    }

    await this.prisma.shipper.delete({ where: { id } });
    return { ok: true };
  }

  async validateLogin(
    phone: string,
    password: string,
  ): Promise<{ id: string; phone: string; name: string }> {
    const normalized = normalizePhone(phone);
    const row = await this.prisma.shipper.findUnique({
      where: { phone: normalized },
    });
    if (!row || !row.active) {
      throw new BadRequestException('Sai SĐT hoặc mật khẩu');
    }
    if (!verifyPassword(password, row.passwordHash)) {
      throw new BadRequestException('Sai SĐT hoặc mật khẩu');
    }
    return { id: row.id, phone: row.phone, name: row.name };
  }
}
