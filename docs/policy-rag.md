# Policy RAG (chính sách đặt lịch)

RAG trên nội dung admin lưu tại **Điều khoản đặt lịch** (`BookingTerms.content`): chunk → OpenAI embedding → pgvector → retrieve → Claude trả lời (cùng system prompt Messenger: `system.md` + `faq.md`).

## Biến môi trường

Trong `backend/.env`:

| Biến | Mô tả |
|------|--------|
| `POLICY_RAG_ENABLED` | `true` / `false` (mặc định bật nếu có `OPENAI_API_KEY`) |
| `OPENAI_API_KEY` | Embedding API |
| `OPENAI_EMBEDDING_MODEL` | Mặc định `text-embedding-3-small` (1536 dims) |
| `POLICY_RAG_TOP_K` | Số chunk retrieve (mặc định 3) |
| `ANTHROPIC_API_KEY` | Cần cho `/policy-rag/ask` và Messenger (generate) |

## Format admin khuyên dùng

```
CÁCH THỨC THUÊ & CỌC

- Ý 1...
- Ý 2...

QUY ĐỊNH ĐỀN BÙ

- Ý 1...
```

- Dòng **IN HOA** = section
- Mỗi dòng **`- `** = 1 chunk khi index

## Postgres pgvector

Local / VPS dùng image `pgvector/pgvector:pg16` trong `docker-compose.yml`.

```bash
docker compose up -d postgres
cd backend && npx prisma migrate deploy
```

## Luồng

1. Admin **Lưu** tại `/admin/terms` → re-index async (DELETE + embed + INSERT)
2. Bootstrap: backend khởi động, nếu chưa có chunk mà DB đã có chính sách → index tự động

## API (yêu cầu đăng nhập admin)

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/policy-rag/status` | `enabled`, `chunkCount`, `lastIndexedAt` |
| GET | `/api/policy-rag/chunks` | Liệt kê chunk (debug) |
| POST | `/api/policy-rag/search` | `{ "question": "..." }` — retrieve-only |
| GET | `/api/policy-rag/test-cases` | Danh sách câu hỏi mẫu (batch) |
| POST | `/api/policy-rag/batch-search` | `{ "questions": ["...", ...] }` — retrieve nhiều câu |
| POST | `/api/policy-rag/preview` | `{ "question": "..." }` — xem system + user message (không gọi Claude) |
| POST | `/api/policy-rag/ask` | Full RAG → `{ reply, chunks }` |
| POST | `/api/policy-rag/reindex` | Re-index từ DB |

## Test trên UI

Trang `/admin/terms` có card **Thử RAG** (khi `enabled`):

1. Lưu chính sách mẫu → xem `chunkCount`
2. **Tìm chunk** — xem score + chunk retrieve
3. **Xem prompt Claude** — payload gửi API (không tốn token Anthropic)
4. **Hỏi AI** — so `chunks` vs `reply`
5. **Chạy test hàng loạt** — 15 câu mẫu, bảng score/section
6. **Xem JSON Messenger** — lịch sử giả lập + `tools` như bot thật
7. **Re-index ngay** — không cần sửa text

## Messenger

Tool `search_booking_policy` (query ngắn) — fallback `get_booking_terms` nếu RAG tắt hoặc chưa index.

`POST /api/messenger/preview-claude` — body `{ "history": [{ "role": "user"|"assistant", "content": "..." }], "currentUserMessage": "..." }` — JSON lượt đầu (system + tools + messages), không gọi Claude.

`GET /api/messenger/simulate-status` — kiểm tra `ANTHROPIC_API_KEY`.

`POST /api/messenger/simulate-chat` — `{ "history": [...], "userMessage": "..." }` — gọi Claude thật (tools), trả `reply` + `rounds[]` (request/response mỗi lượt API). UI: card **Giả lập chat Messenger** trên `/admin/terms`.

## VPS deploy

Sau pull: recreate Postgres nếu đổi image lần đầu; backup DB trước. Chạy migrate như deploy thường.
