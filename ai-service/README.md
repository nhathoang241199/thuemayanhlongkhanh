# AI Service — FastAPI + LangGraph

Customer chatbot, separate from NestJS. Nest only forwards Facebook webhooks; the admin simulator calls this service directly.

## Requirements

- Python 3.11+
- Postgres (same `docker compose` stack as the backend)

## Setup

```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Set DATABASE_URL, MINIMAX_API_KEY, USE_LLM_AGENT=true
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

## LangGraph nodes

1. **route** — intent classification (regex)
2. **greeting_node / booking_node / policy_fees_node / shop_contact_node / shop_promotion_node** — canned replies
3. **price_node / availability_node** — DB lookups, no LLM
4. **agent_node** — LangChain ReAct agent + tools (MiniMax-M2.5)

Inspect the path in the response field `graph_trace`.

## API

- `GET /health`
- `GET /v1/status`
- `POST /v1/chat` — header `X-Internal-Token` (when configured)

## Tests

```bash
pytest
```
