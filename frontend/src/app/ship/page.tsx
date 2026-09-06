"use client";

import {
  Badge,
  Box,
  Button,
  CardBody,
  CardRoot,
  HStack,
  IconButton,
  Link,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ShipBottomTabs } from "@/components/ship/ship-bottom-tabs";
import {
  ShipChevronLeftIcon,
  ShipChevronRightIcon,
} from "@/components/ship/chevron-icons";
import { ShipCccdCaptureButton } from "@/components/ship/ship-cccd-capture-button";
import { ShipWithdrawDialog } from "@/components/ship/ship-withdraw-dialog";
import {
  shipDisplayStatusColor,
  shipDisplayStatusLabel,
  type ShipDisplayStatus,
} from "@/lib/ship-display-status";
import { formatShipOrderRequestedAt } from "@/lib/datetime-vn";
import { formatVnd } from "@/lib/format-vnd";
import { shopPhoneTelHref } from "@/lib/shop-info";
import {
  claimShipOrder,
  completeShipOrder,
  fetchMyShipOrders,
  fetchPendingShipOrders,
  fetchShipperSession,
  fetchWaitingReturnShipOrders,
  reopenShipOrder,
  requestShipperPayout,
  unclaimShipOrder,
  type ShipOrder,
} from "@/lib/shipper-auth";
import {
  mutedAccentColor,
  titleColor,
  userBookingCardProps,
} from "@/lib/user-theme";

function canClaimOrder(order: ShipOrder): boolean {
  return order.displayStatus === "WAIT_CLAIM";
}

/** Hoàn thành đơn giao (OUTBOUND). */
function canCompleteDeliver(order: ShipOrder): boolean {
  return (
    order.leg === "OUTBOUND" &&
    order.status === "CLAIMED" &&
    order.displayStatus === "WAIT_DELIVER"
  );
}

/** Hoàn thành đơn trả: RETURN đã nhận, hoặc đơn giao xong đang ở tab cần trả. */
function canCompleteReturn(order: ShipOrder): boolean {
  if (
    order.leg === "RETURN" &&
    order.status === "CLAIMED" &&
    order.displayStatus === "WAIT_RETURN"
  ) {
    return true;
  }
  return (
    order.leg === "OUTBOUND" &&
    order.status === "COMPLETED" &&
    order.displayStatus === "WAIT_RETURN"
  );
}

function canCompleteOrder(order: ShipOrder): boolean {
  return canCompleteDeliver(order) || canCompleteReturn(order);
}

/** Hoàn tác giao xong trong ngày (bấm ▶ nhầm). Backend cũng kiểm tra ngày. */
function canUndoDeliverComplete(order: ShipOrder): boolean {
  return (
    order.leg === "OUTBOUND" &&
    order.status === "COMPLETED" &&
    order.displayStatus === "WAIT_RETURN"
  );
}

function canBackOrder(order: ShipOrder): boolean {
  if (canUndoDeliverComplete(order)) return true;
  return (
    order.status === "CLAIMED" &&
    (order.displayStatus === "WAIT_DELIVER" ||
      (order.displayStatus === "WAIT_RETURN" && order.leg === "RETURN"))
  );
}

function deliveredWaitingReturn(order: ShipOrder): boolean {
  return (
    order.leg === "OUTBOUND" &&
    order.status === "COMPLETED" &&
    order.displayStatus === "WAIT_RETURN"
  );
}

function belongsToShipTab(
  order: ShipOrder,
  tab: ShipDisplayStatus,
): boolean {
  if (tab === "WAIT_RETURN") {
    return (
      order.displayStatus === "WAIT_RETURN" || order.displayStatus === "DONE"
    );
  }
  return order.displayStatus === tab;
}

function showCccdCapture(order: ShipOrder): boolean {
  return (
    order.displayStatus === "WAIT_DELIVER" &&
    order.leg === "OUTBOUND" &&
    order.status === "CLAIMED" &&
    !order.customerHasVerificationImages
  );
}

function mergeBoardOrders(
  pending: ShipOrder[],
  mine: ShipOrder[],
  waitingReturn: ShipOrder[],
): ShipOrder[] {
  const byId = new Map<string, ShipOrder>();
  for (const order of [...waitingReturn, ...mine, ...pending]) {
    byId.set(order.id, order);
  }
  return [...byId.values()].sort(
    (a, b) =>
      new Date(a.scheduleAt).getTime() - new Date(b.scheduleAt).getTime(),
  );
}

function ShipOrderCard({
  order,
  loadingId,
  onAdvance,
  onBack,
  onRefresh,
}: {
  order: ShipOrder;
  loadingId: string | null;
  onAdvance: (order: ShipOrder) => void;
  onBack: (order: ShipOrder) => void;
  onRefresh: () => void;
}) {
  const phoneHref = shopPhoneTelHref(order.customerPhone);
  const showClaim = canClaimOrder(order);
  const showComplete = canCompleteOrder(order);
  const showBack = canBackOrder(order);
  const showCamera = showCccdCapture(order);
  const showActions = showClaim || showComplete || showBack || showCamera;

  return (
    <CardRoot {...userBookingCardProps}>
      <CardBody>
        <Stack gap={2}>
          <HStack justify="space-between" align="flex-start" gap={2}>
            <Stack gap={0.5} flex="1" minW={0}>
              <Text fontWeight="semibold" color={titleColor}>
                {order.customerName}
              </Text>
              {phoneHref ? (
                <Link
                  href={phoneHref}
                  fontSize="sm"
                  color={mutedAccentColor}
                  textDecoration="underline"
                >
                  {order.customerPhone}
                </Link>
              ) : (
                <Text fontSize="sm" color={mutedAccentColor}>
                  {order.customerPhone}
                </Text>
              )}
            </Stack>
            <Badge
              variant="subtle"
              flexShrink={0}
              colorPalette={shipDisplayStatusColor(order.displayStatus)}
            >
              {shipDisplayStatusLabel(order.displayStatus)}
            </Badge>
          </HStack>
          <Text fontSize="sm" color="fg.muted">
            {order.address}
          </Text>
          {deliveredWaitingReturn(order) ? (
            <Text fontSize="xs" color="fg.muted">
              Đã giao — bấm ▶ khi đã trả máy. Bấm ◀ nếu hoàn thành giao nhầm.
            </Text>
          ) : null}
          <HStack justify="space-between" align="center" gap={2}>
            <Text
              fontSize="sm"
              fontWeight="medium"
              color={titleColor}
              flex="1"
              minW={0}
            >
              {formatShipOrderRequestedAt(order.scheduleAt)}
            </Text>
            {showActions ? (
              <HStack justify="flex-end" gap={1} flexShrink={0}>
                {showBack ? (
                  <IconButton
                    type="button"
                    size="lg"
                    variant="subtle"
                    colorPalette="orange"
                    flexShrink={0}
                    aria-label={
                      canUndoDeliverComplete(order)
                        ? "Hoàn tác hoàn thành giao"
                        : "Trả lại đơn"
                    }
                    loading={loadingId === order.id}
                    onClick={() => onBack(order)}
                  >
                    <ShipChevronLeftIcon boxSize="1.35rem" />
                  </IconButton>
                ) : null}
                {showCamera ? (
                  <ShipCccdCaptureButton
                    orderId={order.id}
                    customerName={order.customerName}
                    disabled={loadingId === order.id}
                    onUploaded={onRefresh}
                  />
                ) : null}
                {showClaim || showComplete ? (
                  <IconButton
                    type="button"
                    size="lg"
                    variant="subtle"
                    colorPalette="green"
                    flexShrink={0}
                    aria-label={
                      canCompleteReturn(order)
                        ? "Hoàn thành trả máy"
                        : showComplete
                          ? "Hoàn thành giao máy"
                          : "Nhận đơn"
                    }
                    loading={loadingId === order.id}
                    onClick={() => onAdvance(order)}
                  >
                    <ShipChevronRightIcon boxSize="1.35rem" />
                  </IconButton>
                ) : null}
              </HStack>
            ) : null}
          </HStack>
        </Stack>
      </CardBody>
    </CardRoot>
  );
}

export default function ShipBoardPage() {
  const router = useRouter();
  const [session, setSession] = useState<{
    phone: string;
    name: string;
    balanceVnd: number;
  } | null>(null);
  const [orders, setOrders] = useState<ShipOrder[]>([]);
  const [activeTab, setActiveTab] = useState<ShipDisplayStatus>("WAIT_CLAIM");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [payoutQrUrl, setPayoutQrUrl] = useState("");
  const [payoutRequestedAt, setPayoutRequestedAt] = useState<string | null>(
    null,
  );
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const reloadSession = useCallback(async () => {
    const s = await fetchShipperSession();
    if (!s) {
      router.replace("/ship/login");
      return null;
    }
    setSession({
      phone: s.phone,
      name: s.name,
      balanceVnd: s.balanceVnd,
    });
    setPayoutQrUrl(s.payoutQrUrl);
    setPayoutRequestedAt(s.payoutRequestedAt);
    return s;
  }, [router]);

  const reload = useCallback(async () => {
    const [pending, mine, waitingReturn] = await Promise.all([
      fetchPendingShipOrders(),
      fetchMyShipOrders(),
      fetchWaitingReturnShipOrders(),
    ]);
    setOrders(mergeBoardOrders(pending, mine, waitingReturn));
  }, []);

  useEffect(() => {
    void (async () => {
      const s = await reloadSession();
      if (!s) return;
      try {
        await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Lỗi tải đơn");
      }
    })();
  }, [reload, reloadSession]);

  const refreshBoard = useCallback(async () => {
    await reload();
    await reloadSession();
  }, [reload, reloadSession]);

  const advance = async (order: ShipOrder) => {
    setLoadingId(order.id);
    setError(null);
    try {
      if (order.displayStatus === "WAIT_CLAIM") {
        await claimShipOrder(order.id);
        setActiveTab(
          order.leg === "RETURN" ? "WAIT_RETURN" : "WAIT_DELIVER",
        );
      } else if (canCompleteOrder(order)) {
        await completeShipOrder(order.id);
        setActiveTab("WAIT_RETURN");
      }
      await refreshBoard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không cập nhật được đơn");
    } finally {
      setLoadingId(null);
    }
  };

  const back = async (order: ShipOrder) => {
    setLoadingId(order.id);
    setError(null);
    try {
      if (canUndoDeliverComplete(order)) {
        await reopenShipOrder(order.id);
        setActiveTab("WAIT_DELIVER");
      } else {
        await unclaimShipOrder(order.id);
        setActiveTab("WAIT_CLAIM");
      }
      await refreshBoard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không trả lại được đơn");
    } finally {
      setLoadingId(null);
    }
  };

  const statusCounts = useMemo(() => {
    const counts: Record<ShipDisplayStatus, number> = {
      WAIT_CLAIM: 0,
      WAIT_DELIVER: 0,
      WAIT_RETURN: 0,
      DONE: 0,
    };
    for (const order of orders) {
      if (order.displayStatus === "DONE") {
        counts.WAIT_RETURN += 1;
      } else {
        counts[order.displayStatus] += 1;
      }
    }
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const rows = orders.filter((order) => belongsToShipTab(order, activeTab));
    if (activeTab !== "WAIT_RETURN") return rows;
    return rows.sort((a, b) => {
      if (a.displayStatus !== b.displayStatus) {
        return a.displayStatus === "WAIT_RETURN" ? -1 : 1;
      }
      return (
        new Date(a.scheduleAt).getTime() - new Date(b.scheduleAt).getTime()
      );
    });
  }, [orders, activeTab]);

  const emptyMessage: Record<ShipDisplayStatus, string> = {
    WAIT_CLAIM: "Không có đơn cần nhận.",
    WAIT_DELIVER: "Không có đơn cần giao.",
    WAIT_RETURN: "Không có đơn cần trả.",
    DONE: "Không có đơn.",
  };

  if (!session) {
    return (
      <Text color="fg.muted" textAlign="center" py={8}>
        Đang tải…
      </Text>
    );
  }

  return (
    <>
      <Stack gap={4} pb={2}>
        <HStack justify="space-between" align="flex-start" gap={2}>
          <Box>
            <Text textStyle="xl" fontWeight="bold" color={titleColor}>
              Xin chào, {session.name || session.phone}
            </Text>
            <Text fontSize="sm" color={mutedAccentColor}>
              {session.phone}
            </Text>
          </Box>
          <Stack gap={1} align="flex-end" textAlign="right" flexShrink={0}>
            <Text fontSize="xs" color={mutedAccentColor}>
              Số dư
            </Text>
            <HStack gap={2} justify="flex-end">
              <Button
                variant="plain"
                size="xs"
                h="auto"
                minH="auto"
                p={0}
                color={payoutRequestedAt ? "orange.fg" : mutedAccentColor}
                fontWeight="medium"
                textDecoration="underline"
                disabled={session.balanceVnd <= 0 && !payoutRequestedAt}
                onClick={() => {
                  setWithdrawError(null);
                  setWithdrawOpen(true);
                }}
              >
                {payoutRequestedAt ? "Đang rút" : "Rút"}
              </Button>
              <Text fontWeight="bold" color={titleColor}>
                {formatVnd(session.balanceVnd)}
              </Text>
            </HStack>
          </Stack>
        </HStack>

        {error ? (
          <Text color="red.fg" fontSize="sm">
            {error}
          </Text>
        ) : null}

        {filteredOrders.length === 0 ? (
          <CardRoot {...userBookingCardProps}>
            <CardBody>
              <Text color="fg.muted" textAlign="center" fontSize="sm">
                {emptyMessage[activeTab]}
              </Text>
            </CardBody>
          </CardRoot>
        ) : (
          filteredOrders.map((order) => (
            <ShipOrderCard
              key={order.id}
              order={order}
              loadingId={loadingId}
              onAdvance={advance}
              onBack={back}
              onRefresh={() => void refreshBoard()}
            />
          ))
        )}
      </Stack>

      <ShipBottomTabs
        active={activeTab}
        counts={statusCounts}
        onChange={setActiveTab}
      />

      <ShipWithdrawDialog
        open={withdrawOpen}
        amountVnd={session.balanceVnd}
        qrUrl={payoutQrUrl}
        requested={Boolean(payoutRequestedAt)}
        requesting={requestingPayout}
        error={withdrawError}
        onClose={() => {
          setWithdrawOpen(false);
          setWithdrawError(null);
        }}
        onRequest={() => {
          void (async () => {
            setRequestingPayout(true);
            setWithdrawError(null);
            try {
              await requestShipperPayout();
              await reloadSession();
            } catch (e) {
              setWithdrawError(
                e instanceof Error ? e.message : "Không gửi được yêu cầu rút",
              );
            } finally {
              setRequestingPayout(false);
            }
          })();
        }}
      />
    </>
  );
}
