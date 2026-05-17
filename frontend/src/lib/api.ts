import type { CustomerSession } from "./customer-session";

export function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
}

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

export type MyBooking = {
  id: string;
  bookingCode: string;
  startBookingDate: string;
  endBookingDate: string;
  slot: string;
  amount: number;
  status: string;
  paymentStatus: string;
  note: string | null;
  pendingChange?: unknown;
  camera: { id: string; name: string; brand: string };
};

export type RequestChangeResult = {
  booking: MyBooking;
  delta: number;
  newAmount: number;
  needsPayment: boolean;
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

export async function requestCustomerBookingChange(
  bookingId: string,
  body: {
    phone: string;
    cameraId: string;
    startDate: string;
    endDate: string;
    slot: string;
    note?: string;
    shippingAddress?: string;
    bankAccountInfo?: string;
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
  bankAccountInfo: string,
): Promise<MyBooking> {
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
  return (await res.json()) as MyBooking;
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
