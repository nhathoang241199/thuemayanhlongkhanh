"use client";

import {
  Box,
  Button,
  CardBody,
  CardRoot,
  CardTitle,
  HStack,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  APP_COLOR_PALETTE,
  cardSurfaceProps,
  fieldInputProps,
} from "@/lib/app-theme";
import { throwIfNotOk, toastApiError } from "@/lib/admin-api";
import { toaster } from "@/lib/toaster";

/** Giống Nest `conversation.service.ts` — production dùng 30s. */
const SIMULATOR_INACTIVITY_MS = 10_000;
const MESSAGE_JOIN = "\n---\n";

type SimulateStatus = {
  configured: boolean;
  model: string;
  history_limit: number;
};

type ChatTurn = {
  id: string;
  userMessage: string;
  reply: string;
  canned?: boolean;
  intent?: string;
  graphTrace: string[];
  rounds: unknown[];
};

function aiServiceBase(): string {
  const configured = process.env.NEXT_PUBLIC_AI_SERVICE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return "/ai-api";
}

function aiServiceHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}

function historyFromTurns(
  turns: ChatTurn[],
): { role: "user" | "assistant"; content: string }[] {
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const t of turns) {
    out.push({ role: "user", content: t.userMessage });
    out.push({ role: "assistant", content: t.reply });
  }
  return out;
}

export function MessengerChatSimulator() {
  const [status, setStatus] = useState<SimulateStatus | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [queuedMessages, setQueuedMessages] = useState<string[]>([]);
  const [flushing, setFlushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const turnsRef = useRef(turns);
  const pendingTextsRef = useRef<string[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStatus = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`${aiServiceBase()}/v1/status`, { signal });
      await throwIfNotOk(res, "Không tải trạng thái AI service");
      const json = (await res.json()) as SimulateStatus;
      if (!signal?.aborted) setStatus(json);
    } catch {
      if (!signal?.aborted) {
        setStatus({ configured: false, model: "—", history_limit: 20 });
      }
    }
  }, []);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  useEffect(() => {
    const ac = new AbortController();
    void loadStatus(ac.signal);
    return () => ac.abort();
  }, [loadStatus]);

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, queuedMessages, flushing]);

  const clearPendingTimer = () => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  };

  const flushPending = useCallback(async () => {
    clearPendingTimer();
    const texts = [...pendingTextsRef.current];
    if (texts.length === 0) return;

    pendingTextsRef.current = [];
    setQueuedMessages([]);

    const combined = texts.join(MESSAGE_JOIN);
    setFlushing(true);
    setError(null);

    try {
      const res = await fetch(`${aiServiceBase()}/v1/chat`, {
        method: "POST",
        headers: aiServiceHeaders(),
        body: JSON.stringify({
          history: historyFromTurns(turnsRef.current),
          user_message: combined,
          context: {
            frontend_url:
              typeof window !== "undefined"
                ? window.location.origin
                : "http://localhost:3001",
          },
        }),
      });
      await throwIfNotOk(res, "Gửi tin thất bại");
      const json = (await res.json()) as {
        reply: string;
        canned?: boolean;
        intent?: string;
        graph_trace?: string[];
        rounds?: unknown[];
      };

      setTurns((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${prev.length}`,
          userMessage: combined,
          reply: json.reply,
          canned: json.canned,
          intent: json.intent,
          graphTrace: json.graph_trace ?? [],
          rounds: json.rounds ?? [],
        },
      ]);
    } catch (e) {
      const msg = toastApiError(e, "Gửi tin thất bại");
      if (msg) setError(msg);
      pendingTextsRef.current = texts;
      setQueuedMessages(texts);
      flushTimerRef.current = setTimeout(() => {
        void flushPending();
      }, SIMULATOR_INACTIVITY_MS);
    } finally {
      setFlushing(false);
    }
  }, []);

  const enqueueMessage = useCallback(
    (text: string) => {
      pendingTextsRef.current.push(text);
      setQueuedMessages([...pendingTextsRef.current]);
      clearPendingTimer();
      flushTimerRef.current = setTimeout(() => {
        void flushPending();
      }, SIMULATOR_INACTIVITY_MS);
    },
    [flushPending],
  );

  const reset = () => {
    clearPendingTimer();
    pendingTextsRef.current = [];
    setQueuedMessages([]);
    setTurns([]);
    setDraft("");
    setFlushing(false);
    setError(null);
    toaster.info({ title: "Đã reset cuộc chat" });
  };

  const send = () => {
    const text = draft.trim();
    if (!text || flushing) return;
    setDraft("");
    enqueueMessage(text);
  };

  const messageCount =
    turns.length * 2 + queuedMessages.length + (flushing ? 1 : 0);
  const limit = status?.history_limit ?? 20;
  const atLimit = messageCount >= limit;

  return (
    <CardRoot {...cardSurfaceProps}>
      <CardBody>
        <Stack gap={4}>
          <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={2}>
            <Box>
              <CardTitle textStyle="lg">Giả lập chat Messenger</CardTitle>
              <Text fontSize="sm" color="fg.muted" mt={1}>
                Gộp tin liên tiếp sau {SIMULATOR_INACTIVITY_MS / 1000}s (giống
                webhook Nest) rồi gọi AI service một lần. Xem graph_trace bên
                dưới.
              </Text>
              {status ? (
                <Text fontSize="xs" color="fg.muted" mt={1}>
                  Service: {aiServiceBase()} · Model:                   {status.model} · Lịch sử{" "}
                  {limit} tin ({messageCount}/{limit})
                  {" · Debounce "}
                  {SIMULATOR_INACTIVITY_MS / 1000}s
                </Text>
              ) : null}
            </Box>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={reset}
              disabled={flushing && turns.length === 0 && queuedMessages.length === 0}
            >
              Reset
            </Button>
          </HStack>

          {error ? (
            <Text color="red.fg" fontSize="sm" fontWeight="medium">
              {error}
            </Text>
          ) : null}

          <Box
            ref={scrollRef}
            borderWidth="1px"
            borderRadius="md"
            p={3}
            minH="280px"
            maxH="480px"
            overflowY="auto"
            bg="bg.subtle"
          >
            {turns.length === 0 && queuedMessages.length === 0 && !flushing ? (
              <Text fontSize="sm" color="fg.muted" textAlign="center" py={12}>
                Gõ vài tin liên tiếp (vd. &quot;a oi&quot; rồi &quot;mai còn r50
                không&quot;) — bot trả lời sau {SIMULATOR_INACTIVITY_MS / 1000}s
                không nhắn thêm.
              </Text>
            ) : null}

            <Stack gap={4}>
              {turns.map((turn) => (
                <Stack key={turn.id} gap={2}>
                  <Box alignSelf="flex-end" maxW="85%">
                    <Box
                      bg={`${APP_COLOR_PALETTE}.solid`}
                      color={`${APP_COLOR_PALETTE}.contrast`}
                      px={3}
                      py={2}
                      borderRadius="lg"
                      borderBottomRightRadius="sm"
                    >
                      <Text fontSize="sm" whiteSpace="pre-wrap">
                        {turn.userMessage}
                      </Text>
                    </Box>
                    <Text fontSize="2xs" color="fg.muted" textAlign="right" mt={0.5}>
                      Khách
                    </Text>
                  </Box>

                  <Box alignSelf="flex-start" maxW="90%">
                    <Box
                      bg="bg"
                      borderWidth="1px"
                      px={3}
                      py={2}
                      borderRadius="lg"
                      borderBottomLeftRadius="sm"
                    >
                      <Text fontSize="sm" whiteSpace="pre-wrap">
                        {turn.reply}
                      </Text>
                    </Box>
                    <Text fontSize="2xs" color="fg.muted" mt={0.5}>
                      Bot
                      {turn.canned ? " · canned" : ""}
                      {turn.intent ? ` · ${turn.intent}` : ""}
                    </Text>
                  </Box>

                  {turn.graphTrace.length > 0 ? (
                    <Text fontSize="xs" color="fg.muted" pl={1}>
                      LangGraph: {turn.graphTrace.join(" → ")}
                    </Text>
                  ) : null}
                </Stack>
              ))}

              {queuedMessages.map((msg, i) => (
                <Box key={`queued-${i}-${msg}`} alignSelf="flex-end" maxW="85%">
                  <Box
                    bg={`${APP_COLOR_PALETTE}.solid`}
                    color={`${APP_COLOR_PALETTE}.contrast`}
                    px={3}
                    py={2}
                    borderRadius="lg"
                    borderBottomRightRadius="sm"
                    opacity={0.85}
                  >
                    <Text fontSize="sm" whiteSpace="pre-wrap">
                      {msg}
                    </Text>
                  </Box>
                  <Text fontSize="2xs" color="fg.muted" textAlign="right" mt={0.5}>
                    Khách
                  </Text>
                </Box>
              ))}

              {queuedMessages.length > 0 && !flushing ? (
                <Text fontSize="xs" color="fg.muted" textAlign="right" pr={1}>
                  Gộp {queuedMessages.length} tin — gọi bot sau{" "}
                  {SIMULATOR_INACTIVITY_MS / 1000}s không nhắn thêm…
                </Text>
              ) : null}

              {flushing ? (
                <Text fontSize="xs" color="fg.muted" textAlign="center">
                  Đang gọi AI service…
                </Text>
              ) : null}
            </Stack>
          </Box>

          <HStack gap={2} align="flex-end">
            <Input
              flex={1}
              value={draft}
              placeholder="Nhập tin nhắn… (Enter gửi)"
              disabled={flushing || atLimit}
              {...fieldInputProps}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button
              type="button"
              colorPalette={APP_COLOR_PALETTE}
              loading={flushing}
              disabled={!draft.trim() || flushing || atLimit}
              onClick={send}
            >
              Gửi
            </Button>
          </HStack>

          {atLimit ? (
            <Text fontSize="xs" color="orange.fg">
              Đã đạt giới hạn {limit} tin — bấm Reset để test lại từ đầu.
            </Text>
          ) : null}
        </Stack>
      </CardBody>
    </CardRoot>
  );
}
