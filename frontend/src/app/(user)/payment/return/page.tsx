"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { Text } from "@chakra-ui/react";

function RedirectContent() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const bookingId = params.get("bookingId");
    const q = bookingId ? `?bookingId=${bookingId}` : "";
    router.replace(`/book/payment${q}`);
  }, [router, params]);

  return (
    <Text textAlign="center" py={8} color="fg.muted">
      Đang chuyển hướng…
    </Text>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <Text textAlign="center" py={8} color="fg.muted">
          Đang tải…
        </Text>
      }
    >
      <RedirectContent />
    </Suspense>
  );
}
