# TuskPoint API service

The real Walrus-backed checkpoint engine behind **tuskpoint.vercel.app**, exposed
over HTTP. The Next.js app proxies to this service so the dashboard is fully live —
no static snapshot, no mocked search.

It wraps the same `WalrusSaver` the MCP server uses (`mcp_server/server.py`), so the
HTTP responses match the MCP tool outputs exactly.

## Endpoints

| Method | Path | Mirrors MCP tool |
|---|---|---|
| GET  | `/health` | — (status: network, memwal on/off, seed thread) |
| GET  | `/seed-thread` | — (default demo thread id) |
| GET  | `/thread/{id}` | `checkpoint_list` |
| GET  | `/thread/{id}/checkpoint/{cid}` | `checkpoint_load` |
| GET  | `/thread/{id}/resume` | `checkpoint_resume` |
| POST | `/thread/{id}/diff` `{id_a,id_b}` | `checkpoint_diff` |
| POST | `/search` `{query}` | `checkpoint_search` |
| POST | `/thread/{id}/save` `{state}` | `checkpoint_save` *(token-gated)* |
| POST | `/fork` `{source_thread_id,source_checkpoint_id,new_thread_id}` | `checkpoint_fork` *(token-gated)* |
| POST | `/thread/{id}/rollback` `{checkpoint_id}` | `checkpoint_rollback` *(token-gated)* |
| POST | `/thread/{id}/handoff` `{checkpoint_id,to_agent?}` | `handoff_checkpoint` *(token-gated)* |
| POST | `/adopt` `{handoff,new_thread_id}` | `adopt_checkpoint` *(token-gated)* |
| GET  | `/thread/{id}/verify` | `verify_trail` |

Mutating routes (`/save`, `/fork`, `/rollback`, `/handoff`, `/adopt`) require
header `x-tuskpoint-token` matching `TUSKPOINT_API_TOKEN`. If that env var is
unset, the gate is open (local dev).

## Run locally

From the repo root, with the engine installed (`pip install -e ".[all]"`) and a
`.env` pointing at **Walrus testnet** (free writes):

```bash
uvicorn api_service.app:app --reload --port 8000
# then:
curl localhost:8000/health
curl localhost:8000/thread/run-43312
curl -X POST localhost:8000/search -H 'content-type: application/json' \
     -d '{"query":"when did the writer start?"}'
```

## Environment variables

| Var | Required | Notes |
|---|---|---|
| `WALRUS_PUBLISHER_URL` | yes | Set to `https://publisher.walrus-testnet.walrus.space` for **free** writes |
| `WALRUS_AGGREGATOR_URL` | yes | `https://aggregator.walrus-testnet.walrus.space` |
| `MEMWAL_PRIVATE_KEY` | for search | Ed25519 delegate key (hex) |
| `MEMWAL_ACCOUNT_ID` | for search | Sui object id |
| `MEMWAL_ENV` | no | default `prod` |
| `MEMWAL_NAMESPACE` | no | default `tuskpoint` |
| `TUSKPOINT_API_TOKEN` | recommended | shared secret; the Next.js proxy sends it |
| `ALLOWED_ORIGIN` | no | e.g. `https://tuskpoint.vercel.app` (CORS) |
| `TUSKPOINT_DEMO_THREAD` | no | default `run-43312` (the thread the dashboard opens) |

## Testnet vs mainnet

The public demo runs on **Walrus testnet** so the dashboard's Save / Fork
buttons make **free** writes — visitors can't spend real funds. `/health`
reports `network`, and the dashboard surfaces it honestly (a "Walrus testnet —
free writes" badge), so nothing is misrepresented as mainnet.

To run the **exact same engine on mainnet** (paid, production writes), point the
two Walrus URLs at mainnet in the service env:

```bash
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-mainnet.walrus.space
# Mainnet writes cost SUI + WAL; there is no free public publisher. Use a
# community publisher or run your own with a funded Sui key, e.g.:
WALRUS_PUBLISHER_URL=https://walrus-mainnet-publisher-1.staketab.org:443
```

No code changes are needed — `/health` will then report `network: mainnet`, and
the dashboard badge, save-card copy, and blob links automatically switch to the
mainnet aggregator.

## Deploy for $0

No platform offers free *always-on* in 2026, but free **scale-to-zero** tiers cost
nothing — the only trade-off is a cold start (~30–60s) on the first request after idle.
The dashboard shows a "waking the live engine…" state to cover this.

### Option 1 — Render free (recommended, no credit card)
1. Push this repo to GitHub.
2. Render → **New → Blueprint** → pick the repo. It reads `api_service/render.yaml`.
3. Fill the secret env vars (`MEMWAL_PRIVATE_KEY`, `MEMWAL_ACCOUNT_ID`,
   `TUSKPOINT_API_TOKEN`, `ALLOWED_ORIGIN`).
4. Deploy. Copy the service URL (e.g. `https://tuskpoint-api.onrender.com`).

### Option 2 — Hugging Face Spaces (Docker, 16 GB RAM)
Create a **Docker** Space, point it at this repo's `api_service/Dockerfile` (build
context = repo root), set the same env vars as Space secrets. Port `7860`.

### Option 3 — Koyeb free
Create a web service from the repo using the `Dockerfile`, set env vars, expose `$PORT`.

After deploying, set these in **Vercel** (Project → Settings → Environment Variables):
- `TUSKPOINT_API_URL` = the service URL above
- `TUSKPOINT_API_TOKEN` = the same token you set on the service

Then redeploy the web app. The dashboard is now fully live.
