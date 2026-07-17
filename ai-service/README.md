# AI Service — FastAPI + LangGraph

Chatbot khách hàng độc lập với NestJS. Nest chỉ forward webhook Facebook; admin simulator gọi trực tiếp service này.

## Yêu cầu

- Python 3.11+
- Postgres (cùng `docker compose` với backend)

## Cài đặt

```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Chỉnh DATABASE_URL, ANTHROPIC_API_KEY, OPENAI_API_KEY (RAG)
```

## Chạy

```bash
uvicorn app.main:app --reload --port 8000
```

## LangGraph — các node

1. **route** — phân loại intent (regex)
2. **greeting_node / booking_node / policy_fees_node / shop_contact_node** — canned
3. **price_node / availability_node** — DB, không gọi Claude
4. **agent_node** — LangChain ReAct agent + tools

Xem trace trong response: `graph_trace`.

## API

- `GET /health`
- `GET /v1/status`
- `POST /v1/chat` — header `X-Internal-Token` (nếu cấu hình)

## Test

```bash
pytest
```
