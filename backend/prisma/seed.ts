import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import {
  inferEndBookingDate,
  type BookingSlotValue,
} from "../src/common/booking-dates";
import {
  dayCountInclusive,
  deliveryFeeVnd,
  slotWindow,
} from "../src/common/booking-schedule";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for seeding");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/** Link YouTube tạm cho demo — đổi trong admin sau. */
const SEED_TUTORIAL_VIDEO_URL =
  "https://www.youtube.com/watch?v=jNQXAC9IVRw";

/**
 * Ảnh máy PNG nền trong suốt — file trong frontend/public/cameras/.
 * Tạo lại: cd frontend && node scripts/generate-camera-pngs.mjs
 */
function seedCameraImageUrl(filename: string): string {
  const base = (process.env.FRONTEND_URL ?? "http://localhost:3001").replace(
    /\/$/,
    "",
  );
  return `${base}/cameras/${filename}`;
}

const SEED_CAMERA_IMAGES = {
  fujiXT5: seedCameraImageUrl("fujifilm-xt5.png"),
  canonM50: seedCameraImageUrl("canon-m50.png"),
  canonR50: seedCameraImageUrl("canon-r50.png"),
  djiPocket3: seedCameraImageUrl("dji-pocket-3.png"),
} as const;

async function main() {
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.camera.deleteMany();
  await prisma.expense.deleteMany();

  const camFuji = await prisma.camera.create({
    data: {
      brand: "FUJIFILM",
      name: "X-T5 kit 18-55",
      quantity: 3,
      dayPrice: 350_000,
      shiftPrice: 200_000,
      imageUrl: SEED_CAMERA_IMAGES.fujiXT5,
      tutorialVideoUrl: SEED_TUTORIAL_VIDEO_URL,
    },
  });

  const camCanon = await prisma.camera.create({
    data: {
      brand: "CANON",
      name: "EOS M50 Mark II",
      quantity: 2,
      dayPrice: 400_000,
      shiftPrice: 220_000,
      imageUrl: SEED_CAMERA_IMAGES.canonM50,
      tutorialVideoUrl: SEED_TUTORIAL_VIDEO_URL,
    },
  });

  const camCanonR50 = await prisma.camera.create({
    data: {
      brand: "CANON",
      name: "EOS R50 kit RF-S 18-45mm",
      quantity: 2,
      dayPrice: 450_000,
      shiftPrice: 250_000,
      imageUrl: SEED_CAMERA_IMAGES.canonR50,
      tutorialVideoUrl: SEED_TUTORIAL_VIDEO_URL,
    },
  });

  const camDji = await prisma.camera.create({
    data: {
      brand: "DJI",
      name: "Pocket 3",
      quantity: 5,
      dayPrice: 280_000,
      shiftPrice: 160_000,
      imageUrl: SEED_CAMERA_IMAGES.djiPocket3,
      tutorialVideoUrl: SEED_TUTORIAL_VIDEO_URL,
    },
  });

  /** Ảnh minh chứng mẫu (CCCD gắn chip — nguồn TGDD, dùng cho demo seed). */
  const cccdSampleImageUrl =
    "https://cdn.tgdd.vn/Files/2022/06/10/1438726/hinh-anh-cccd-gan-chip-tgdd-1-3_1280x720-800-resize.jpg";

  const demoFacebookUrl = "https://www.facebook.com/kuroducnhat.hoang/";

  const customer1 = await prisma.customer.create({
    data: {
      name: "Nguyễn Văn An",
      phone: "0901000001",
      facebookUrl: demoFacebookUrl,
      customerTag: "NORMAL",
      verificationImageUrls: [cccdSampleImageUrl],
      note:
        "Khách test — liên hệ qua Facebook khi cần xác nhận nhanh. Ưu tiên giao máy buổi sáng.",
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: "Trần Thị Bình",
      phone: "0901000002",
      facebookUrl: demoFacebookUrl,
      customerTag: "VIP",
      isVerified: true,
      verificationImageUrls: [cccdSampleImageUrl],
      note:
        "VIP — đã xác minh CCCD. Hay thuê cuối tuần, nhắn Messenger trước 1 ngày.",
    },
  });

  /** Đơn demo: mỗi ngày nhiều booking từ hôm nay đến hết tháng (lịch local), đa dạng để test. */
  const BOOKINGS_PER_DAY = 8;

  const now = new Date();
  const y = now.getFullYear();
  const monthIndex = now.getMonth();
  const todayDay = now.getDate();
  const lastDayOfMonth = new Date(y, monthIndex + 1, 0).getDate();

  const pad2 = (n: number) => String(n).padStart(2, "0");

  const localDateKey = (d: Date) => {
    const yy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    return `${yy}-${mm}-${dd}`;
  };

  const addDaysToDateKey = (dateKey: string, days: number) => {
    const [yy, mm, dd] = dateKey.split("-").map(Number);
    return localDateKey(new Date(yy, mm - 1, dd + days));
  };

  const todayKey = localDateKey(now);

  const cameraMeta = [
    { id: camFuji.id, dayPrice: 350_000, shiftPrice: 200_000, label: "X-T5" },
    { id: camCanon.id, dayPrice: 400_000, shiftPrice: 220_000, label: "M50 II" },
    { id: camCanonR50.id, dayPrice: 450_000, shiftPrice: 250_000, label: "R50" },
    { id: camDji.id, dayPrice: 280_000, shiftPrice: 160_000, label: "Pocket 3" },
  ] as const;

  const scenarios: Array<{
    slot: "FULL_DAY" | "MORNING" | "AFTERNOON" | "EVENING";
    paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
    status:
      | "PENDING_PAYMENT"
      | "CONFIRMED"
      | "RENTING"
      | "LATE_RETURN"
      | "COMPLETED"
      | "CANCELLED";
    note: string;
    ship: boolean;
  }> = [
    {
      slot: "FULL_DAY",
      paymentStatus: "PAID",
      status: "CONFIRMED",
      note: "Giao tại cửa hàng — cả ngày",
      ship: false,
    },
    {
      slot: "MORNING",
      paymentStatus: "PENDING",
      status: "PENDING_PAYMENT",
      note: "Chờ chuyển khoản cọc",
      ship: true,
    },
    {
      slot: "AFTERNOON",
      paymentStatus: "PAID",
      status: "RENTING",
      note: "Khách đang dùng máy",
      ship: true,
    },
    {
      slot: "EVENING",
      paymentStatus: "PAID",
      status: "COMPLETED",
      note: "Trả máy đúng giờ",
      ship: false,
    },
    {
      slot: "FULL_DAY",
      paymentStatus: "FAILED",
      status: "PENDING_PAYMENT",
      note: "Thanh toán online lỗi — gọi lại",
      ship: false,
    },
    {
      slot: "MORNING",
      paymentStatus: "REFUNDED",
      status: "CANCELLED",
      note: "Khách hủy — đã hoàn tiền",
      ship: false,
    },
    {
      slot: "AFTERNOON",
      paymentStatus: "PAID",
      status: "CONFIRMED",
      note: "Ship COD Long Khánh",
      ship: true,
    },
    {
      slot: "EVENING",
      paymentStatus: "PENDING",
      status: "CONFIRMED",
      note: "Ưu tiên setup trước 30 phút",
      ship: true,
    },
    {
      slot: "AFTERNOON",
      paymentStatus: "PAID",
      status: "LATE_RETURN",
      note: "Trả máy trễ — demo",
      ship: false,
    },
  ];

  const shipLines = [
    "123 Nguyễn Trãi, Long Khánh, Đồng Nai",
    "45 Hà Huy Giáp, Biên Hòa, Đồng Nai",
    "KTX ĐHQG — khu B, TP.HCM",
  ];

  let bookingCount = 0;
  for (let day = todayDay; day <= lastDayOfMonth; day++) {
    for (let i = 0; i < BOOKINGS_PER_DAY; i++) {
      const mix = day * 31 + i * 7 + bookingCount;
      const cam = cameraMeta[mix % cameraMeta.length]!;
      const sc = scenarios[mix % scenarios.length]!;
      const customerId =
        mix % 2 === 0 ? customer1.id : customer2.id;
      const amount =
        sc.slot === "FULL_DAY" ? cam.dayPrice : cam.shiftPrice;

      const hour = 7 + ((i * 2 + (mix % 5)) % 12);
      const minute = (mix * 13 + i * 5) % 60;
      const startBookingDate = new Date(
        y,
        monthIndex,
        day,
        hour,
        minute,
        0,
        0,
      );
      const endBookingDate = inferEndBookingDate(
        startBookingDate,
        sc.slot as BookingSlotValue,
      );

      const bookingCode = `DH-${y}${pad2(monthIndex + 1)}${pad2(day)}-${pad2(i + 1)}`;

      await prisma.booking.create({
        data: {
          bookingCode,
          customerId,
          cameraId: cam.id,
          startBookingDate,
          endBookingDate,
          slot: sc.slot,
          amount,
          note: `[${cam.label}] ${sc.note} (seed ${day}/${monthIndex + 1})`,
          shippingAddress: sc.ship
            ? shipLines[mix % shipLines.length]!
            : null,
          paymentStatus: sc.paymentStatus,
          status: sc.status,
        },
      });
      bookingCount += 1;
    }
  }

  const overdueStart = new Date(now);
  overdueStart.setDate(overdueStart.getDate() - 2);
  overdueStart.setHours(9, 0, 0, 0);
  const overdueEnd = new Date(now);
  overdueEnd.setDate(overdueEnd.getDate() - 1);
  overdueEnd.setHours(12, 0, 0, 0);

  await prisma.booking.create({
    data: {
      bookingCode: `DH-${y}${pad2(monthIndex + 1)}-OVERDUE`,
      customerId: customer1.id,
      cameraId: camFuji.id,
      startBookingDate: overdueStart,
      endBookingDate: overdueEnd,
      slot: "AFTERNOON",
      amount: camFuji.shiftPrice,
      note: "[X-T5] Đang thuê quá hạn — auto Trả trễ khi load danh sách",
      paymentStatus: "PAID",
      status: "RENTING",
    },
  });
  bookingCount += 1;

  /** Đơn thuê nhiều ngày — test cột ngày thuê & tổng tiền theo số ngày. */
  type MultiDaySeed = {
    codeSuffix: string;
    customerId: string;
    camera: (typeof cameraMeta)[number];
    startDate: string;
    endDate: string;
    slot: BookingSlotValue;
    paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
    status:
      | "PENDING_PAYMENT"
      | "CONFIRMED"
      | "RENTING"
      | "LATE_RETURN"
      | "COMPLETED"
      | "CANCELLED";
    note: string;
    ship?: boolean;
  };

  const multiDayBookings: MultiDaySeed[] = [
    {
      codeSuffix: "MULTI3",
      customerId: customer2.id,
      camera: cameraMeta[1]!,
      startDate: todayKey,
      endDate: addDaysToDateKey(todayKey, 2),
      slot: "FULL_DAY",
      paymentStatus: "PAID",
      status: "CONFIRMED",
      note: "Thuê 3 ngày — Canon M50, giao tận nơi",
      ship: true,
    },
    {
      codeSuffix: "MULTI5",
      customerId: customer1.id,
      camera: cameraMeta[0]!,
      startDate: addDaysToDateKey(todayKey, 1),
      endDate: addDaysToDateKey(todayKey, 5),
      slot: "FULL_DAY",
      paymentStatus: "PAID",
      status: "CONFIRMED",
      note: "Thuê 5 ngày — Fuji X-T5, tự lấy tại cửa hàng",
    },
    {
      codeSuffix: "MULTI7",
      customerId: customer2.id,
      camera: cameraMeta[3]!,
      startDate: addDaysToDateKey(todayKey, 2),
      endDate: addDaysToDateKey(todayKey, 8),
      slot: "FULL_DAY",
      paymentStatus: "PAID",
      status: "RENTING",
      note: "Thuê 7 ngày — DJI Pocket 3, đang trong kỳ thuê",
    },
    {
      codeSuffix: "MULTI2",
      customerId: customer1.id,
      camera: cameraMeta[2]!,
      startDate: addDaysToDateKey(todayKey, 4),
      endDate: addDaysToDateKey(todayKey, 5),
      slot: "FULL_DAY",
      paymentStatus: "PENDING",
      status: "PENDING_PAYMENT",
      note: "Thuê 2 ngày — Canon R50, chờ thanh toán",
    },
    {
      codeSuffix: "MULTI4P",
      customerId: customer1.id,
      camera: cameraMeta[0]!,
      startDate: addDaysToDateKey(todayKey, -4),
      endDate: addDaysToDateKey(todayKey, -1),
      slot: "FULL_DAY",
      paymentStatus: "PAID",
      status: "COMPLETED",
      note: "Thuê 4 ngày — đã hoàn tất (tuần trước)",
    },
  ];

  for (const md of multiDayBookings) {
    const { startBookingDate } = slotWindow(md.startDate, md.slot);
    const { endBookingDate } = slotWindow(md.endDate, md.slot);
    const dayCount = dayCountInclusive(md.startDate, md.endDate);
    const unitPrice =
      md.slot === "FULL_DAY" ? md.camera.dayPrice : md.camera.shiftPrice;
    const shippingAddress = md.ship
      ? shipLines[0]!
      : null;
    const amount = unitPrice * dayCount + deliveryFeeVnd(shippingAddress);
    const [sy, sm, sd] = md.startDate.split("-").map(Number);

    await prisma.booking.create({
      data: {
        bookingCode: `DH-${sy}${pad2(sm)}${pad2(sd)}-${md.codeSuffix}`,
        customerId: md.customerId,
        cameraId: md.camera.id,
        startBookingDate,
        endBookingDate,
        slot: md.slot,
        amount,
        note: `[${md.camera.label}] ${md.note} (${dayCount} ngày)`,
        shippingAddress,
        paymentStatus: md.paymentStatus,
        status: md.status,
      },
    });
    bookingCount += 1;
  }

  const expenseAt = new Date();
  await prisma.expense.create({
    data: {
      title: "Mua thẻ nhớ + pin dự phòng",
      amount: 1_200_000,
      note: "Phục vụ bộ máy cho thuê",
      expenseDate: expenseAt,
    },
  });

  await prisma.expense.create({
    data: {
      title: "Vận chuyển linh kiện",
      amount: 150_000,
      expenseDate: expenseAt,
    },
  });

  console.log("Seed xong:", {
    cameras: [camFuji.id, camCanon.id, camCanonR50.id, camDji.id],
    customers: [customer1.id, customer2.id],
    bookings: bookingCount,
    expenses: 2,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
