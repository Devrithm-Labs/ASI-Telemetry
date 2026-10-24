# ASI-Telemetry Agent (ACP)

A read-only **Fetch.ai agent** that lets developers query their ASI-Telemetry
account through the **Agent Chat Protocol (ACP)** and discover it via
**Agentverse / ASI:ONE**.

Ask questions like *"how many tokens did I use in the last 7 days"*,
*"what did I spend this month"*, or *"show me the last 5 traces"* from
ASI:ONE chat, and the agent answers with **real data from the existing
ASI-Telemetry backend** — never fabricated values.

> This component lives in `app-agent/` at the repository root. It does not
> modify the existing frontend (`apps/app-web`) or backend
> (`apps/app-backend`) in any way.

---

## What it does

- Implements Fetch.ai's **Agent Chat Protocol v0.3.0** (`uagents` +
  `uagents-core`), so ASI:ONE and other ACP clients can talk to it.
- Answers **deterministic, read-only** telemetry questions (no LLM
  involved) by calling the existing FastAPI backend's analytics endpoints.
- Requires each chat participant to **link their own ASI-Telemetry account**
  with a dashboard API key before any private data is shown. Every backend
  call is scoped server-side to the account that owns the key.
- Distinguishes clearly between *no data*, *estimated cost* (derived from
  ingested telemetry), and confirmed billing (not available).

## Architecture

```
ASI:ONE / ACP client
        │  Agent Chat Protocol (ChatMessage / ChatAcknowledgement)
        ▼
app-agent/agent.py          uAgent runtime: identity (seed), port/endpoint/mailbox,
        │                   ACP manifest publishing, ack + reply wiring
        ▼
app-agent/handlers/chat.py  ChatProcessor: intent routing, account-link enforcement,
        │                   safe error handling (backend down, bad data, auth failure)
        ├── handlers/intents.py   keyword/regex intent + time-range parsing (no LLM)
        └── handlers/responses.py formatting of validated backend data into chat text
        ▼
app-agent/services/
        ├── telemetry.py    read-only capability facade (tokens, cost, apps, errors, traces)
        └── account_link.py in-memory sender-address → API-key bindings (never logged/disk)
        ▼
app-agent/api_client.py     async httpx client: timeouts, schema validation,
        │                   typed errors, Bearer API-key auth
        ▼
apps/app-backend (existing) account-scoped aggregation + authorization
        ▼
ClickHouse (existing)
```

Design rules:

- **No duplicated analytics.** The backend already aggregates everything
  (`apps/app-backend/database/llm.py`, `database/telemetry.py`); the agent
  only formats results.
- **No second database.** Linkings live in process memory only.
- **No LLM dependency.** Intents are parsed deterministically.
- **Fail safe.** Any backend outage, malformed response, or auth failure
  produces a clear, non-crashing chat reply.

## Python environment setup

Requires **Python 3.10–3.13** (the uAgents supported range; developed and
tested on 3.11).

```bash
cd app-agent
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt  # runtime dependencies
pip install -r requirements-dev.txt  # + test dependencies (pytest)
```

## Environment configuration

```bash
cp .env.example .env
```

| Variable | Required | Purpose |
|---|---|---|
| `AGENT_NAME` | no (default `asi_telemetry_agent`) | Agent name |
| `AGENT_SEED_PHRASE` | **yes to run** | Derives the agent's Fetch.ai address. Keep secret, never commit |
| `AGENT_PORT` | no (default `8200`) | Local uAgent HTTP port |
| `AGENT_ENDPOINT` | no | Comma-separated endpoint URLs; default `http://localhost:<port>/submit` |
| `AGENT_MAILBOX` | no (default `false`) | Use Agentverse mailbox instead of a public inbound endpoint |
| `TELEMETRY_API_BASE_URL` | no (default `http://localhost:8080`) | Existing backend base URL |
| `TELEMETRY_ACCOUNT_AUTH_MODE` | no (default `link`) | Chat-based account linking (`link`) |
| `HTTP_TIMEOUT_SECONDS` | no (default `10`) | Backend request timeout |
| `LOG_LEVEL` | no (default `INFO`) | Logging level |
| `AGENTVERSE_API_KEY` | registration only | Agentverse API key for the registration script |

Configuration is validated at startup (`config.py`); invalid values fail
fast with a clear message. `.env` is git-ignored — never commit secrets.

## Running locally

1. Start the existing backend (`cd apps/app-backend && pip install -r
   requirements.txt && python run.py`) — optionally with ClickHouse.
2. Create an account and API key (see *Account authentication* below).
3. Run the agent:

```bash
cd app-agent && source .venv/bin/activate
python agent.py
```

On startup the agent logs its **address** (`agent1q...`) — this is the
identity you register with Agentverse. For local development you can test
with the Agent Inspector URL printed by uAgents, or directly through
ASI:ONE after registration.

## Tests

```bash
cd app-agent && source .venv/bin/activate
python -m pytest
```

All tests run **offline** against a mocked backend (`httpx.MockTransport`)
and require **no production credentials or network access**. Coverage:
configuration validation, intent parsing (supported, ambiguous,
unsupported), API client success/timeout/connection-error/malformed-JSON/
schema-mismatch/auth-failure behavior, account-link lifecycle, missing
analytics data, backend outages, and **cross-account isolation** (one
sender can never see another account's numbers).

## Supported questions & commands

Link your account first: send `connect my account` to sign in with Google (recommended), or `link account <api-key>` as fallback.

| Command / Question | Action / Answer |
|---|---|
| `connect my account` | Initiates Google OAuth 2.0 PKCE flow and returns browser authorization link |
| `AUTH-XXXXXX` | Exchanges single-use handoff code for 15-min access token & 30-day refresh token |
| `account overview` | Account identity + backend/storage health |
| `token usage for the last 7 days` | Total/prompt/completion tokens, trace counts |
| `what did I spend in the last 30 days` | **Estimated** cost from telemetry + per-trace average |
| `project summary` / `which applications are active` | Applications reporting telemetry + request stats |
| `error rate and latency this week` | Error counts, success rate, avg/p99 latency, 30-day uptime |
| `show me the last 5 traces` | Most recent LLM traces (model, tokens, latency, est. cost) |
| `diagnose` / `why did it fail` | AI-assisted runtime error investigation, root cause hypothesis, and patch |
| `approve pr` | Explicit human approval to create feature branch and GitHub PR for proposed patch |
| `unlink` / `logout` | Drops in-memory credentials and revokes backend refresh token session |
| `help`, `hello` | Guidance / welcome text |

Time ranges: `last hour`, `today`/`24 hours`, `this week`/`7 days`,
`this month`/`30 days`, `all time`.

## Secure Account Linking & Token Renewal

### 1. Google OAuth 2.0 PKCE Flow (No API Key in Chat)
Developers do **not** need to paste long-lived API keys into ASI1 chat:
1. Developer sends: `connect my account`.
2. Agent calls `POST /api/auth/oauth/agent-init` and returns a secure Google authorization URL with PKCE (`S256`).
3. Developer signs in with Google in their browser.
4. Google redirects to `GET /api/auth/oauth/callback`. The backend verifies the Google ID token and issues ASI-Telemetry's own 15-minute access token and 30-day rotating refresh token.
5. The browser displays a single-use handoff code (`AUTH-XXXXXX`).
6. Developer returns to chat and sends the code. The agent calls `POST /api/auth/oauth/agent-exchange` to receive tokens into memory. The handoff code is immediately burned/invalidated.

### 2. Automatic Token Renewal
- Protected telemetry requests send `Authorization: Bearer <access_token>`.
- If an access token expires (HTTP 401), the agent automatically calls `POST /api/auth/refresh` using the rotating refresh token, updates stored credentials, and retries the request seamlessly.
- **Refresh Token Rotation**: Each refresh generates a new refresh token and revokes the old one. If reuse of an old token is detected, the entire token family is revoked immediately.
- **HTTP 403 Forbidden**: Treated strictly as an authorization policy violation and does not trigger token refresh.

## AI-Assisted Error Diagnosis & GitHub Workflow

When an error or backend failure occurs:
1. **Sanitized Diagnostic Capture**: The agent automatically captures a sanitized diagnostic record (`err_...`), redacting Authorization headers, Bearer tokens, API keys, passwords, and database connection strings.
2. **Diagnosis (`diagnose`)**: Developer asks the agent to investigate. The agent outputs the error category, sanitized stack trace, root cause hypothesis, and proposes a code patch.
3. **Strict Human Approval Gate**: The agent **never** creates remote branches, commits code, or opens pull requests without explicit confirmation.
4. **Pull Request Creation (`approve pr`)**: Once approved, the agent creates an isolated feature branch (`fix/err-...`), runs validation tests, and opens a structured PR targeting the base branch. Direct writes to default branches (`main`/`master`) are strictly prohibited.

   `POST /api/auth/signup|login`) and creates a dedicated API key via the
   dashboard's **Settings → API Keys** UI or `POST /api/api-keys`
   (keys look like `asi_dev_...`).
2. In chat: `link account asi_dev_...`.
3. The agent **validates the key server-side** via `GET /api/auth/me`
   before storing anything, then binds the key to the chat sender address
   **in memory only** (lost on restart; re-linking required).
4. All data queries present the key as a Bearer token; the backend scopes
   every response to the owning account, so cross-account access is
   impossible even if agent logic failed.
5. `unlink account` removes the binding immediately. Revoked/expired keys
   produce a safe message and auto-unlink.

**Security boundaries**

- Passwords are never requested; only scoped dashboard API keys.
- A user-supplied account ID is never trusted — the key *is* the credential
  and the backend validates it.
- Keys are never logged, never written to disk, never echoed back in full.
  Logs record only intent names, sender addresses, and outcomes.
- No account modifications of any kind are performed (read-only agent).

**Proposed backend improvement (requires approval, not implemented):**
a `POST /api/agent-links` endpoint (Bearer-authenticated) that binds an
ASI:ONE address to the account server-side, plus a lookup endpoint the
agent can call. This would remove the need to send even a scoped API key
in chat. Smallest change: one new ClickHouse table
(`agent_links(address, user_id, created_at)`) + two routes reusing
`auth.dependencies.get_current_user`.

## Agentverse registration & evaluation

Registration makes the agent discoverable through ASI:ONE; **it does not
host it** — the agent must keep running on your infrastructure.

1. Deploy the agent somewhere with a **publicly reachable endpoint** (HTTPS
   reverse proxy or tunnel in front of `AGENT_PORT`), or run with
   `AGENT_MAILBOX=true` to use the Agentverse mailbox service (outbound-only
   connection, no open inbound port).
2. Set a strong, secret `AGENT_SEED_PHRASE`; the startup log shows the
   resulting `agent1q...` address. Losing the seed loses the identity.
3. In [Agentverse](https://agentverse.ai): **Agents → Launch an Agent →
   Connect Agent → Chat Protocol**, enter the agent name and public
   endpoint (Agentverse verifies reachability), and add discovery keywords.
4. Run the **generated registration script** (it needs your
   `AGENTVERSE_API_KEY` and the agent's seed phrase) in an environment
   where the agent identity is available.
5. Click **Evaluate Registration** while the agent and its endpoint stay
   online. On success, open the agent profile, complete the README/handle,
   and test via **Chat with Agent** (ASI:ONE).

This repository intentionally performs **no external registration and
publishes no credentials** — that step is yours and requires explicit
approval in any shared environment.

## Deployment requirements and limitations

**Requirements**

- Python 3.10–3.13; dependencies from `requirements.txt`.
- A reachable ASI-Telemetry backend (`TELEMETRY_API_BASE_URL`).
- For ASI:ONE discovery: a public HTTPS endpoint or mailbox mode, an
  Agentverse account/API key, and the seed phrase.
- Keep the process supervised (systemd/Docker) — in-memory linkings are
  lost on restart, though the agent itself keeps running fine.

**Limitations**

- Read-only: no writes, deletes, or account changes through the agent.
- Account links are per-process, in-memory, and single-account per chat
  sender; re-link after restarts.
- Cost figures are telemetry-derived estimates, not confirmed billing.
- "Projects" are shown as backend `applications` (agent-name groups).
- Deterministic intent matching: unusual phrasings may fall into the
  "unsupported" reply (use `help` for the expected phrasings).
- No rate limiting or per-sender quotas yet; add a reverse proxy with rate
  limits before public deployment.
