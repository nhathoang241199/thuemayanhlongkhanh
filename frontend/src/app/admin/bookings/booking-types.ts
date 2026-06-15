export type BookingCustomer = {
  id: string;
  name: string;
  phone: string;
  verificationImageUrls: string[];
};

export type BookingCamera = {
  id: string;
  name: string;
  brand: string;
};

export type BookingLens = {
  id: string;
  name: string;
};

export type Booking = {
  id: string;
  bookingCode: string;
  customerId: string;
  cameraId: string;
  startBookingDate: string;
  endBookingDate: string;
  pickupAt: string | null;
  returnNextMorning?: boolean;
  slot: string;
  amount: number;
  note: string | null;
  shippingAddress: string | null;
  paymentStatus: string;
  status: string;
  contractCccd?: string | null;
  collateralMethod?: string | null;
  collateralImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  customer: BookingCustomer;
  camera: BookingCamera;
  lens?: BookingLens | null;
};

export type BookingStatusValue =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "RENTING"
  | "COMPLETED"
  | "PENDING_REFUND_CANCEL"
  | "CANCELLED";

export type PaymentStatusValue =
  | "PENDING"
  | "DEPOSITED"
  | "PAID"
  | "FAILED"
  | "REFUNDED";

export const tableCellPad = { px: 4, py: 3 };
