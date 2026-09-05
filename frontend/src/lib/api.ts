import type { CustomerSession } from "./customer-session";

import { apiBase } from "./api-base";

export { apiBase };

export type IdentifyCustomerResponse = {
  customer: {
    id: string;
    name: string;
    phone: string;
    isVerified: boolean;
  };
  created: boolean;
};

export async function fetchCustomerVerification(
  phone: string,
): Promise<{ isVerified: boolean }> {
  const params = new URLSearchParams({ phone });
  const res = await fetch(
    `${apiBase()}/api/customers/verification?${params}`,
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as { isVerified: boolean };
}

export async function identifyCustomer(
  name: string,
  phone: string,
): Promise<IdentifyCustomerResponse> {
  const res = await fetch(`${apiBase()}/api/customers/identify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as IdentifyCustomerResponse;
}

export type ShipOrder = {
  id: string;
  leg: "OUTBOUND" | "RETURN";
  status: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  address: string;
  shipperId: string | null;
  shipper?: { name: string } | null;
  requestedAt: string;
  claimedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

export type MyBooking = {
  id: string;
  bookingCode: string;
  startBookingDate: string;
  endBookingDate: string;
  pickupAt: string | null;
  slot: string;
  returnNextMorning?: boolean;
  amount: number;
  status: string;
  paymentStatus: string;
  note: string | null;
  shippingAddress?: string | null;
  shipOrders?: ShipOrder[];
  pendingChange?: unknown;
  /** CONFIRMED: máy vật lý sẵn sàng nhận; null: không hiện badge */
  cameraReady?: boolean | null;
  camera: { id: string; name: string; brand: string };
  lens?: { id: string; name: string } | null;
};

export type RequestChangeResult = {
  booking: MyBooking;
  newAmount: number;
  balanceDue: number;
};

export type CancelBookingResult = {
  booking: MyBooking;
  refundEligible: boolean;
  refundAmount: number;
};

export async function fetchMyBookings(phone: string): Promise<MyBooking[]> {
  const params = new URLSearchParams({ phone });
  const res = await fetch(`${apiBase()}/api/bookings/mine?${params}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as MyBooking[];
}

export async function updatePendingCustomerBooking(
  bookingId: string,
  body: {
    phone: string;
    cameraId: string;
    lensId?: string | null;
    startDate: string;
    endDate: string;
    slot: string;
    pickupAt: string;
    returnNextMorning?: boolean;
    note?: string;
    shippingAddress?: string | null;
  },
): Promise<MyBooking> {
  const res = await fetch(
    `${apiBase()}/api/bookings/customer/${bookingId}/update-pending`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as MyBooking;
}

export async function requestCustomerBookingChange(
  bookingId: string,
  body: {
    phone: string;
    cameraId: string;
    lensId?: string | null;
    startDate: string;
    endDate: string;
    slot: string;
    pickupAt: string;
    returnNextMorning?: boolean;
    note?: string;
    shippingAddress?: string;
  },
): Promise<RequestChangeResult> {
  const res = await fetch(
    `${apiBase()}/api/bookings/customer/${bookingId}/request-change`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as RequestChangeResult;
}

export async function cancelCustomerBooking(
  bookingId: string,
  phone: string,
  bankAccountInfo?: string,
): Promise<CancelBookingResult> {
  const res = await fetch(
    `${apiBase()}/api/bookings/customer/${bookingId}/cancel`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, bankAccountInfo }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as CancelBookingResult;
}

export async function requestCustomerReturn(
  bookingId: string,
  phone: string,
): Promise<ShipOrder> {
  const res = await fetch(
    `${apiBase()}/api/bookings/customer/${bookingId}/request-return`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as ShipOrder;
}

export function sessionFromIdentify(
  data: IdentifyCustomerResponse,
): CustomerSession {
  return {
    id: data.customer.id,
    name: data.customer.name,
    phone: data.customer.phone,
    isVerified: data.customer.isVerified,
  };
}
