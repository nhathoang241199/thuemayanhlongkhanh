"use client";

import {
  Box,
  Button,
  Circle,
  HStack,
  IconButton,
  Spinner,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { throwIfNotOk, toastApiError } from "@/lib/admin-api";
import { apiBase } from "@/lib/api-base";
import {
  ADMIN_COLOR_PALETTE,
  accentColor,
  cardSurfaceProps,
  fieldInputProps,
} from "@/lib/app-theme";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const QUICK_PROMPTS = [
  "Doanh thu và lợi nhuận tháng này?",
  "Tháng này có bao nhiêu đơn hủy?",
  "Tổng bao nhiêu thiết bị trong kho?",
  "Có bao nhiêu khách VIP?",
  "Tháng này shop nghỉ ngày nào?",
  "Đơn đang chờ cọc có bao nhiêu?",
] as const;

const ChatIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden
  >
    <path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden
  >
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export function AdminAssistantChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      listEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, open]);

  const sendMessages = useCallback(async (nextMessages: ChatMessage[]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/api/admin-assistant/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      if (res.status === 401) {
        throw new Error(
          "Phiên admin hết hạn — vui lòng đăng nhập lại tại /admin/login",
        );
      }
      await throwIfNotOk(res, "Trợ lý AI không phản hồi");
      const data = (await res.json()) as { reply: string };
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (e) {
      const msg = toastApiError(e, "Lỗi trợ lý AI");
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSend = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = { role: "user", content: trimmed };
      const next = [...messages, userMsg];
      setMessages(next);
      setInput("");
      void sendMessages(next);
    },
    [loading, messages, sendMessages],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <>
      {!open ? (
        <IconButton
          type="button"
          aria-label="Mở trợ lý AI"
          position="fixed"
          right={{ base: 4, md: 6 }}
          bottom={{ base: 4, md: 6 }}
          zIndex={1500}
          size="lg"
          borderRadius="full"
          colorPalette={ADMIN_COLOR_PALETTE}
          variant="solid"
          shadow="lg"
          onClick={() => setOpen(true)}
        >
          <ChatIcon />
        </IconButton>
      ) : null}

      {open ? (
        <Box
          position="fixed"
          right={{ base: 3, md: 6 }}
          bottom={{ base: 3, md: 6 }}
          zIndex={1500}
          w={{ base: "calc(100vw - 1.5rem)", sm: "22rem", md: "24rem" }}
          maxH="min(32rem, calc(100dvh - 2rem))"
          display="flex"
          flexDirection="column"
          {...cardSurfaceProps}
          borderRadius="lg"
          shadow="xl"
          overflow="hidden"
        >
          <HStack
            px={3}
            py={2.5}
            borderBottomWidth="1px"
            borderColor="ocean.200"
            bg="ocean.600"
            color="white"
            justify="space-between"
          >
            <HStack gap={2}>
              <Circle size="8" bg="whiteAlpha.300">
                <ChatIcon />
              </Circle>
              <Stack gap={0}>
                <Text fontWeight="semibold" fontSize="sm">
                  Trợ lý AI
                </Text>
                <Text fontSize="xs" opacity={0.85}>
                  Hỏi về doanh thu, đơn, kho…
                </Text>
              </Stack>
            </HStack>
            <IconButton
              type="button"
              aria-label="Đóng trợ lý AI"
              size="sm"
              variant="ghost"
              color="white"
              _hover={{ bg: "whiteAlpha.200" }}
              onClick={() => setOpen(false)}
            >
              <CloseIcon />
            </IconButton>
          </HStack>

          <Stack
            flex="1"
            overflowY="auto"
            px={3}
            py={3}
            gap={2}
            minH={0}
            bg="ocean.50"
          >
            {messages.length === 0 ? (
              <Stack gap={2}>
                <Text fontSize="sm" color="ocean.700">
                  Chào bạn! Hỏi về shop hoặc chọn gợi ý:
                </Text>
                <Stack gap={1.5}>
                  {QUICK_PROMPTS.map((prompt) => (
                    <Button
                      key={prompt}
                      type="button"
                      size="xs"
                      variant="outline"
                      colorPalette={ADMIN_COLOR_PALETTE}
                      justifyContent="flex-start"
                      whiteSpace="normal"
                      h="auto"
                      py={2}
                      textAlign="left"
                      onClick={() => handleSend(prompt)}
                      disabled={loading}
                    >
                      {prompt}
                    </Button>
                  ))}
                </Stack>
              </Stack>
            ) : (
              messages.map((m, i) => (
                <Box
                  key={`${m.role}-${i}`}
                  alignSelf={m.role === "user" ? "flex-end" : "flex-start"}
                  maxW="92%"
                  px={3}
                  py={2}
                  borderRadius="md"
                  bg={m.role === "user" ? "ocean.600" : "white"}
                  color={m.role === "user" ? "white" : "ocean.900"}
                  borderWidth={m.role === "assistant" ? "1px" : undefined}
                  borderColor="ocean.200"
                  fontSize="sm"
                  whiteSpace="pre-wrap"
                >
                  {m.content}
                </Box>
              ))
            )}
            {loading ? (
              <HStack gap={2} color="ocean.600" fontSize="sm">
                <Spinner size="sm" color={accentColor} />
                <Text>Đang tra cứu dữ liệu…</Text>
              </HStack>
            ) : null}
            {error ? (
              <Text fontSize="sm" color="red.600">
                {error}
              </Text>
            ) : null}
            <div ref={listEndRef} />
          </Stack>

          <Stack px={3} py={3} gap={2} borderTopWidth="1px" borderColor="ocean.200">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Hỏi trợ lý… (Enter gửi)"
              rows={2}
              resize="none"
              disabled={loading}
              {...fieldInputProps}
            />
            <Button
              type="button"
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
              alignSelf="flex-end"
              disabled={loading || !input.trim()}
              onClick={() => handleSend(input)}
            >
              Gửi
            </Button>
          </Stack>
        </Box>
      ) : null}
    </>
  );
}
