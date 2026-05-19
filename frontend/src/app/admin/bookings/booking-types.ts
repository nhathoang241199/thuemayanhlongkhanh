export type BookingCustomer = {
  id: string;
  name: string;
  phone: string;
};

export type BookingCamera = {
  id: string;
  name: string;
  brand: string;
};

export type Booking = {
  id: string;
  bookingCode: string;
  customerId: string;
  cameraId: string;
  startBookingDate: string;
  endBookingDate: string;
  pickupAt: string | null;
  slot: string;
  amount: number;
  note: string | null;
  shippingAddress: string | null;
  paymentStatus: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  customer: BookingCustomer;
  camera: BookingCamera;
};

export type BookingStatusValue =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "RENTING"
  | "LATE_RETURN"
  | "COMPLETED"
  | "PENDING_REFUND_CANCEL"
  | "CANCELLED";

export type PaymentStatusValue =
  | "PENDING"
  | "DEPOSITED"
  | "PAID"
  | "REFUNDED";

export const tableCellPad = { px: 4, py: 3 };
