"use client";

import {
  Box,
  Button,
  CardBody,
  CardRoot,
  CardTitle,
  Input,
  Stack,
  Table,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";

import {
  APP_COLOR_PALETTE,
  cardSurfaceProps,
  fieldInputProps,
} from "@/lib/app-theme";
import { apiBase } from "@/lib/api-base";
import { throwIfNotOk, toastApiError } from "@/lib/admin-api";
import { toaster } from "@/lib/toaster";

type RagStatus = {
  enabled: boolean;
  askEnabled: boolean;
  chunkCount: number;
  sourceId: string;
  lastIndexedAt: string | null;
};

type RagChunkHit = {
  section: string | null;
  content: string;
  score: number;
};

type ClaudePreview = {
  model: string;
  maxTokens: number;
  system: string;
  userMessage: string;
  messages: { role: string; content: string }[];
  chunks: RagChunkHit[];
  claudeApiRequest: {
    model: string;
    max_tokens: number;
    system: string;
    messages: { role: string; content: string }[];
  };
};

type BatchRow = {
  question: string;
  topSection: string | null;
  topScore: number | null;
  chunks: RagChunkHit[];
};

export function PolicyRagTestPanel() {
  const [status, setStatus] = useState<RagStatus | null>(null);
  const [question, setQuestion] = useState("");
  const [hits, setHits] = useState<RagChunkHit[]>([]);
  const [reply, setReply] = useState<string | null>(null);
  const [preview, setPreview] = useState<ClaudePreview | null>(null);
  const [batchRows, setBatchRows] = useState<BatchRow[] | null>(null);
  const [batchQuestions, setBatchQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState<
    | "status"
    | "search"
    | "ask"
    | "preview"
    | "reindex"
    | "batch"
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async (signal?: AbortSignal) => {
    setLoading("status");
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/api/policy-rag/status`, {
        credentials: "include",
        signal,
      });
      await throwIfNotOk(res, "Không tải được trạng thái RAG");
      const json = (await res.json()) as RagStatus;
      if (!signal?.aborted) setStatus(json);
    } catch (e) {
      if (signal?.aborted) return;
      const msg = toastApiError(e, "Không tải được trạng thái RAG");
      if (msg) setError(msg);
    } finally {
      if (!signal?.aborted) setLoading(null);
    }
  }, []);

  const loadTestCases = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`${apiBase()}/api/policy-rag/test-cases`, {
        credentials: "include",
        signal,
      });
      await throwIfNotOk(res, "Không tải câu hỏi mẫu");
      const json = (await res.json()) as { questions: string[] };
      if (!signal?.aborted) setBatchQuestions(json.questions ?? []);
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void loadStatus(ac.signal);
    void loadTestCases(ac.signal);
    return () => ac.abort();
  }, [loadStatus, loadTestCases]);

  if (status && !status.enabled) return null;

  const runSearch = () => {
    void (async () => {
      const q = question.trim();
      if (!q) {
        toaster.warning({ title: "Nhập câu hỏi để tìm chunk" });
        return;
      }
      setLoading("search");
      setError(null);
      setReply(null);
      setPreview(null);
      try {
        const res = await fetch(`${apiBase()}/api/policy-rag/search`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q }),
        });
        await throwIfNotOk(res, "Tìm chunk thất bại");
        const json = (await res.json()) as { chunks: RagChunkHit[] };
        setHits(json.chunks ?? []);
      } catch (e) {
        const msg = toastApiError(e, "Tìm chunk thất bại");
        if (msg) setError(msg);
      } finally {
        setLoading(null);
      }
    })();
  };

  const runAsk = () => {
    void (async () => {
      const q = question.trim();
      if (!q) {
        toaster.warning({ title: "Nhập câu hỏi để hỏi AI" });
        return;
      }
      setLoading("ask");
      setError(null);
      setPreview(null);
      try {
        const res = await fetch(`${apiBase()}/api/policy-rag/ask`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q }),
        });
        await throwIfNotOk(res, "Hỏi AI thất bại");
        const json = (await res.json()) as {
          reply: string;
          chunks: RagChunkHit[];
        };
        setReply(json.reply);
        setHits(json.chunks ?? []);
      } catch (e) {
        const msg = toastApiError(e, "Hỏi AI thất bại");
        if (msg) setError(msg);
      } finally {
        setLoading(null);
      }
    })();
  };

  const runPreview = () => {
    void (async () => {
      const q = question.trim();
      if (!q) {
        toaster.warning({ title: "Nhập câu hỏi để xem prompt" });
        return;
      }
      setLoading("preview");
      setError(null);
      setReply(null);
      try {
        const res = await fetch(`${apiBase()}/api/policy-rag/preview`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q }),
        });
        await throwIfNotOk(res, "Xem prompt thất bại");
        const json = (await res.json()) as {
          noChunks?: boolean;
          preview: ClaudePreview | null;
        };
        if (json.noChunks || !json.preview) {
          setPreview(null);
          setHits([]);
          toaster.warning({
            title: "Chưa có chunk — lưu chính sách hoặc Re-index",
          });
          return;
        }
        setPreview(json.preview);
        setHits(json.preview.chunks ?? []);
      } catch (e) {
        const msg = toastApiError(e, "Xem prompt thất bại");
        if (msg) setError(msg);
      } finally {
        setLoading(null);
      }
    })();
  };

  const runBatch = () => {
    void (async () => {
      const questions =
        batchQuestions.length > 0
          ? batchQuestions
          : [
              "Sinh viên cọc bao nhiêu?",
              "Hỏng máy thì đền bù sao?",
              "Mất phụ kiện thì sao?",
            ];
      setLoading("batch");
      setError(null);
      setBatchRows(null);
      try {
        const res = await fetch(`${apiBase()}/api/policy-rag/batch-search`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions }),
        });
        await throwIfNotOk(res, "Test hàng loạt thất bại");
        const json = (await res.json()) as {
          results: BatchRow[];
        };
        setBatchRows(json.results ?? []);
        toaster.success({
          title: `Đã test ${json.results?.length ?? 0} câu`,
        });
      } catch (e) {
        const msg = toastApiError(e, "Test hàng loạt thất bại");
        if (msg) setError(msg);
      } finally {
        setLoading(null);
      }
    })();
  };

  const runReindex = () => {
    void (async () => {
      setLoading("reindex");
      setError(null);
      try {
        const res = await fetch(`${apiBase()}/api/policy-rag/reindex`, {
          method: "POST",
          credentials: "include",
        });
        await throwIfNotOk(res, "Re-index thất bại");
        toaster.success({ title: "Đã re-index chính sách" });
        await loadStatus();
      } catch (e) {
        const msg = toastApiError(e, "Re-index thất bại");
        if (msg) setError(msg);
      } finally {
        setLoading(null);
      }
    })();
  };

  return (
    <CardRoot {...cardSurfaceProps}>
      <CardBody>
        <Stack gap={6}>
          <Box>
            <CardTitle textStyle="lg">Thử RAG chính sách</CardTitle>
            <Text fontSize="sm" color="fg.muted" mt={1}>
              Retrieve chunk từ pgvector (OpenAI embedding) rồi tóm tắt bằng Claude.
              Format khuyên dùng: dòng IN HOA = section, mỗi dòng &quot;- &quot; = một ý.
            </Text>
          </Box>

          {status ? (
            <Text fontSize="sm">
              Chunk đã index: <strong>{status.chunkCount}</strong>
              {status.lastIndexedAt
                ? ` · Lần cuối: ${new Date(status.lastIndexedAt).toLocaleString("vi-VN")}`
                : null}
              {!status.askEnabled ? (
                <Text as="span" color="orange.fg">
                  {" "}
                  (Thiếu ANTHROPIC_API_KEY — chỉ dùng Tìm chunk)
                </Text>
              ) : null}
            </Text>
          ) : null}

          {error ? (
            <Text color="red.fg" fontSize="sm" fontWeight="medium">
              {error}
            </Text>
          ) : null}

          <Box borderTopWidth="1px" pt={4}>
            <Text fontSize="md" fontWeight="semibold" mb={3}>
              1. Một câu (RAG thuần)
            </Text>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={1}>
                Câu hỏi thử
              </Text>
              <Input
                value={question}
                placeholder="vd. Sinh viên cọc gì? / cọc 2 triệu / hỏng máy"
                {...fieldInputProps}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </Box>

            <Stack direction={{ base: "column", sm: "row" }} gap={2} mt={3}>
              <Button
                type="button"
                colorPalette={APP_COLOR_PALETTE}
                loading={loading === "search"}
                disabled={loading !== null && loading !== "search"}
                onClick={runSearch}
              >
                Tìm chunk
              </Button>
              <Button
                type="button"
                variant="outline"
                loading={loading === "preview"}
                disabled={loading !== null && loading !== "preview"}
                onClick={runPreview}
              >
                Xem JSON Claude
              </Button>
              <Button
                type="button"
                variant="outline"
                loading={loading === "ask"}
                disabled={
                  !status?.askEnabled || (loading !== null && loading !== "ask")
                }
                onClick={runAsk}
              >
                Hỏi AI
              </Button>
              <Button
                type="button"
                variant="surface"
                loading={loading === "reindex"}
                disabled={loading !== null && loading !== "reindex"}
                onClick={runReindex}
              >
                Re-index ngay
              </Button>
            </Stack>

            {preview ? (
              <Box mt={4}>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  JSON Policy RAG (1 tin user, không có tools)
                </Text>
                <Textarea
                  value={JSON.stringify(preview.claudeApiRequest, null, 2)}
                  readOnly
                  rows={16}
                  fontFamily="mono"
                  fontSize="xs"
                  {...fieldInputProps}
                />
              </Box>
            ) : null}

            {reply ? (
              <Box mt={4}>
                <Text fontSize="sm" fontWeight="medium" mb={1}>
                  Trả lời AI
                </Text>
                <Text fontSize="sm" whiteSpace="pre-wrap">
                  {reply}
                </Text>
              </Box>
            ) : null}

            {hits.length > 0 ? (
              <Box mt={4}>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Chunk retrieve ({hits.length})
                </Text>
                <Stack gap={2}>
                  {hits.map((hit, index) => (
                    <Box
                      key={`${hit.content}-${index}`}
                      p={3}
                      borderWidth="1px"
                      borderRadius="md"
                      fontSize="sm"
                    >
                      <Text color="fg.muted" mb={1}>
                        #{index + 1}
                        {hit.section ? ` · ${hit.section}` : ""}
                        {" · score "}
                        {hit.score.toFixed(4)}
                      </Text>
                      <Text whiteSpace="pre-wrap">{hit.content}</Text>
                    </Box>
                  ))}
                </Stack>
              </Box>
            ) : null}
          </Box>

          <Box borderTopWidth="1px" pt={4}>
            <Text fontSize="md" fontWeight="semibold" mb={1}>
              2. Test dài — {batchQuestions.length || 15} câu retrieve
            </Text>
            <Text fontSize="sm" color="fg.muted" mb={3}>
              Chạy hàng loạt câu hỏi mẫu, xem chunk #1 và score có khớp chủ đề không.
            </Text>
            <Button
              type="button"
              variant="outline"
              loading={loading === "batch"}
              disabled={loading !== null && loading !== "batch"}
              onClick={runBatch}
            >
              Chạy test hàng loạt
            </Button>

            {batchRows && batchRows.length > 0 ? (
              <Box mt={4} overflowX="auto">
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>#</Table.ColumnHeader>
                      <Table.ColumnHeader>Câu hỏi</Table.ColumnHeader>
                      <Table.ColumnHeader>Top section</Table.ColumnHeader>
                      <Table.ColumnHeader>Score</Table.ColumnHeader>
                      <Table.ColumnHeader>Chunk #1 (rút gọn)</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {batchRows.map((row, i) => (
                      <Table.Row key={row.question}>
                        <Table.Cell>{i + 1}</Table.Cell>
                        <Table.Cell maxW="200px">
                          <Text fontSize="xs">{row.question}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="xs">{row.topSection ?? "—"}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="xs" fontFamily="mono">
                            {row.topScore?.toFixed(4) ?? "—"}
                          </Text>
                        </Table.Cell>
                        <Table.Cell maxW="320px">
                          <Text fontSize="xs" lineClamp={2}>
                            {row.chunks[0]?.content ?? "—"}
                          </Text>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            ) : null}
          </Box>
        </Stack>
      </CardBody>
    </CardRoot>
  );
}
