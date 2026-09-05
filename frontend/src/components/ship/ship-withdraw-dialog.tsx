"use client";

import {
  Box,
  Button,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  Text,
} from "@chakra-ui/react";

import { formatVnd } from "@/lib/format-vnd";
import { titleColor, userOutlineButtonProps } from "@/lib/user-theme";

export function ShipWithdrawDialog({
  open,
  amountVnd,
  qrUrl,
  requested,
  requesting,
  error,
  onClose,
  onRequest,
}: {
  open: boolean;
  amountVnd: number;
  qrUrl: string;
  requested: boolean;
  requesting: boolean;
  error: string | null;
  onClose: () => void;
  onRequest: () => void;
}) {
  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
    >
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent maxW="sm" w="full" mx={4}>
          <DialogHeader>
            <DialogTitle color={titleColor}>Rút tiền</DialogTitle>
            <DialogCloseTrigger />
          </DialogHeader>
          <DialogBody>
            <Text fontSize="sm" color="fg.muted" mb={3}>
              Số dư {formatVnd(amountVnd)}.
              {requested
                ? " Đã gửi yêu cầu — chờ shop chuyển khoản theo QR của bạn."
                : " Bấm gửi yêu cầu để shop biết bạn muốn rút."}
            </Text>
            {error ? (
              <Text color="red.fg" fontSize="sm" mb={3}>
                {error}
              </Text>
            ) : null}
            {qrUrl ? (
              <Box
                borderWidth="1px"
                borderColor="border.muted"
                borderRadius="md"
                overflow="hidden"
                bg="white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt="QR nhận tiền"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </Box>
            ) : (
              <Text fontSize="sm" color="fg.muted">
                Chưa có mã QR. Nhờ shop thêm QR ngân hàng của bạn trước khi rút.
              </Text>
            )}
          </DialogBody>
          <DialogFooter>
            {requested ? (
              <Button {...userOutlineButtonProps} onClick={onClose}>
                Đóng
              </Button>
            ) : (
              <>
                <Button {...userOutlineButtonProps} onClick={onClose}>
                  Huỷ
                </Button>
                <Button
                  colorPalette="blue"
                  disabled={amountVnd <= 0 || requesting || !qrUrl}
                  loading={requesting}
                  onClick={onRequest}
                >
                  Gửi yêu cầu rút
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
