# ASI-Telemetry Authentication — Learning Guide

This guide documents the Python authentication implementation added to `apps/app-backend`.
It is designed to be read alongside the source code.

## 1. What this project does

ASI-Telemetry is an observability dashboard for AI-agent execution. The existing backend receives telemetry events from the Python SDK, stores them in ClickHouse when available, and serves dashboard analytics.

This authentication layer adds user accounts for the dashboard/API:

- Sign up with a name, email, and password.
- Log in with email and password.
- Receive a signed JSON Web Token (JWT) access token.
- Send that token as a Bearer token to identify the current user.
- Store account data in a local SQLite database, separately from ClickHouse telemetry.

**Important boundary:** telemetry ingestion (`POST /api/metrics` and `POST /api/telemetry`) remains open so an SDK can send metrics without a human dashboard login. The existing dashboard endpoint has not been wired to require a token yet, so adding the API is not the same as securing every existing route. Before production, connect the frontend login flow and protect dashboard/user-specific endpoints as described in section 10.

## 2. Authentication flow

### Sign up

1. Client sends `POST /api/auth/signup` with JSON containing `name`, `email`, and `password`.
2. FastAPI validates the request using `SignupRequest` in `auth/schemas.py`.
3. `auth/service.py` normalizes the email and hashes the password.
4. `auth/database.py` inserts the account into SQLite. The database's unique email constraint prevents duplicate accounts.
5. The service creates a signed access token and returns it with the public user profile.
6. The raw password and password hash are never included in the response.

### Log in

1. Client sends `POST /api/auth/login` with email and password.
2. The service looks up the account by normalized email.
3. `verify_password()` checks the submitted password against the saved Argon2 password hash.
4. If credentials are wrong, the API returns `401 Invalid email or password`.
5. If they are valid, the API issues a new signed JWT.

### Access a protected identity endpoint

1. Client adds `Authorization: Bearer <access_token>` to `GET /api/auth/me`.
2. `OAuth2PasswordBearer` extracts the token.
3. `get_current_user()` verifies the signature, expiry, token type, and user ID.
4. If valid, the API returns the user's public profile. Missing, malformed, expired, or invalid tokens return `401`.

## 3. File map

```text
apps/app-backend/
├── auth/
│   ├── __init__.py
│   ├── database.py       # SQLite connection and users table
│   ├── schemas.py        # Validated request/response models
│   ├── security.py       # Argon2 password hashing and JWT creation/decoding
│   ├── service.py        # Signup/login business logic and account lookup
│   └── dependencies.py   # Bearer-token validation for protected endpoints
├── routes/
│   ├── auth.py           # HTTP routes for signup, login, and /me
│   └── telemetry.py      # Existing telemetry routes
├── config/settings.py   # Environment-driven auth settings
├── main.py               # Initializes auth DB and mounts auth routes
├── .env.example
├── requirements.txt
└── AUTHENTICATION.md
```

## 4. Important implementation concepts

### Password hashing

Passwords must not be stored as plain text. `hash_password()` uses `pwdlib`'s recommended password-hashing configuration (Argon2). During login, `verify_password()` compares the supplied password with the saved hash. Hashing is intentionally one-way: the server never decrypts a password.

### SQLite user database

The account database defaults to `apps/app-backend/data/auth.db`. It is independent of ClickHouse because ClickHouse is optimized for telemetry/time-series analytics, not account transactions. SQLite is convenient for local development and a hackathon demo. For a multi-instance production deployment, use a managed transactional database such as PostgreSQL and persistent storage.

The SQL uses parameterized queries (`?`) rather than concatenating user input into SQL. Email has a unique, case-insensitive constraint.

### JWT access token

A JWT is signed using `AUTH_SECRET_KEY` and the HS256 algorithm. Its claims include:

- `sub`: user ID, stored as a string as required by common JWT conventions.
- `email`: the account email at the time the token was issued.
- `iat`: issued-at timestamp.
- `exp`: expiry timestamp.
- `type`: `access`, checked by the authentication dependency.

A JWT is signed, not encrypted. Do not put passwords or secrets in its payload. This implementation uses short-lived access tokens and does not implement refresh tokens, server-side token revocation, email verification, password reset, rate limiting, or role-based access control.

## 5. Setup

Run commands from the backend directory:

```bash
cd apps/app-backend
python -m venv .venv
source .venv/bin/activate
```

On Windows PowerShell, activate with:

```powershell
.venv\Scripts\Activate.ps1
```

Install packages:

```bash
pip install -r requirements.txt
```

Create a `.env` file by copying `.env.example`, then set `AUTH_SECRET_KEY` to a long random secret. For example, generate one with Python:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Paste the generated value into `.env`:

```env
AUTH_SECRET_KEY=paste-your-generated-secret-here
ACCESS_TOKEN_EXPIRE_MINUTES=60
AUTH_DATABASE_PATH=./data/auth.db
```

Do not commit `.env` or share the secret. The default secret in source code exists only to make local development straightforward; replace it before any shared deployment.

Start the server:

```bash
python run.py
```

Open `http://localhost:8080/docs` for interactive Swagger documentation. On startup, `main.py` initializes the SQLite `users` table. You do not need to create the table manually.

## 6. Try the API

### Sign up

`POST http://localhost:8080/api/auth/signup`

```json
{
  "name": "Ritesh",
  "email": "ritesh@example.com",
  "password": "a-strong-password"
}
```

Expected status: `201 Created`.

Example response shape (the token will be different):

```json
{
  "status": "success",
  "message": "Account created successfully",
  "access_token": "eyJ...<signed-token>",
  "token_type": "bearer",
  "expires_in_minutes": 60,
  "user": {
    "id": 1,
    "name": "Ritesh",
    "email": "ritesh@example.com",
    "created_at": "2026-10-11T..."
  }
}
```

### Log in

`POST http://localhost:8080/api/auth/login`

```json
{
  "email": "ritesh@example.com",
  "password": "a-strong-password"
}
```

Expected status: `200 OK`. Save the returned `access_token` for the next request.

### Get the current user

`GET http://localhost:8080/api/auth/me`

Request header:

```http
Authorization: Bearer <paste-access-token-here>
```

Expected status: `200 OK` with the public user profile. Without a valid token, expect `401 Unauthorized`.

### Check validation and error behavior

| Scenario | Expected status | Why |
|---|---:|---|
| Valid signup | 201 | Account created |
| Signup with an email already used | 409 | Unique email constraint |
| Password shorter than 8 characters | 422 | Pydantic validation |
| Invalid email format | 422 | Email validation |
| Correct login credentials | 200 | Access token issued |
| Wrong email or password | 401 | Generic credentials error |
| `/api/auth/me` without token | 401 | Bearer token required |
| `/api/auth/me` with expired/invalid token | 401 | Token rejected |

Use a different email for each successful signup test. For an end-to-end smoke test, sign up, copy the token, call `/api/auth/me`, then log in with the same credentials.

## 7. How the code is connected

1. `main.py` imports `auth_router` and registers it with `app.include_router(auth_router)`.
2. `routes/auth.py` is the HTTP boundary. It parses request schemas and calls service functions.
3. `auth/schemas.py` validates incoming fields and describes safe response shapes.
4. `auth/service.py` owns the use cases: account creation, credential verification, and token issuance.
5. `auth/database.py` owns SQLite connection setup and the user table.
6. `auth/security.py` owns password hashing and JWT cryptography.
7. `auth/dependencies.py` is reusable authentication middleware at the route level. Add `Depends(get_current_user)` to any route that should require a signed-in user.

This separation keeps HTTP details, business rules, persistence, and cryptographic operations from being mixed into one large route function.

## 8. API reference

| Method | Path | Auth required? | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | No | Create account and return token |
| POST | `/api/auth/login` | No | Verify credentials and return token |
| GET | `/api/auth/me` | Yes | Return current account |
| POST | `/api/auth/oauth/agent-init` | No | Initiate OAuth 2.0 PKCE session bound to agent |
| GET | `/api/auth/oauth/callback` | No | Google OAuth callback & handoff code generation |
| POST | `/api/auth/oauth/agent-exchange`| No | Single-use handoff code exchange for tokens |
| POST | `/api/auth/refresh` | No | 15-minute access token renewal with rotation |
| POST | `/api/auth/logout` | No | Revoke refresh token family session |
| POST | `/api/metrics` | No | Existing SDK telemetry ingestion |
| POST | `/api/telemetry` | No | Existing alias for telemetry ingestion |
| GET | `/api/dashboard` | Optional / Key | Dashboard telemetry overview |
| GET | `/api/health` | No | Existing health status |

Signup, login, and OAuth callbacks are public by design.

## 9. Google OAuth 2.0 & Token Lifecycle Architecture

### OAuth 2.0 Authorization Code Flow with PKCE
To prevent pasting long-lived API keys or credentials directly into ASI:ONE chat conversations, authentication uses Google OAuth 2.0 with PKCE (RFC 7636):

1. **Session Initiation (`POST /api/auth/oauth/agent-init`)**:
   - The agent sends its Fetch.ai sender address (`agent1q...`).
   - The backend creates an in-memory session record, generates a cryptographically random code verifier (64 bytes URL-safe), derives the SHA-256 code challenge (`S256`), and generates an OAuth state parameter bound to the session (`{session_id}.{nonce}`).
   - Returns a Google sign-in URL requesting only minimal identity scopes (`openid email profile`).

2. **Google Sign-In & Callback (`GET /api/auth/oauth/callback`)**:
   - The user opens the link in their browser and authorizes ASI-Telemetry.
   - Google redirects to `/api/auth/oauth/callback` with `code` and `state`.
   - The backend validates the `state` against active pending sessions, preventing state forgery and replay.
   - Google's token endpoint exchanges the authorization code using the verified PKCE `code_verifier`.
   - Google's ID token signature, issuer, audience, and expiry are verified using `google.oauth2.id_token.verify_oauth2_token`.
   - The user is created or linked according to existing account uniqueness rules (`users` table).
   - ASI-Telemetry issues its own 15-minute access token and 30-day refresh token.
   - A single-use, cryptographically random handoff code (`AUTH-XXXXXX`, 10-minute expiry) is returned to the user in a clean browser landing page.

3. **Secure Agent Session Handoff (`POST /api/auth/oauth/agent-exchange`)**:
   - The user returns to chat and sends their handoff code (or confirms).
   - The agent calls `/api/auth/oauth/agent-exchange` presenting `sender_address` and `handoff_code`.
   - The backend confirms that `sender_address` matches the session that initiated the flow.
   - The session and handoff code are immediately burned and invalidated (single-use constraint).
   - The agent receives the access token and refresh token into memory.

### Application Token Lifecycle
- **Access Token**:
  - Signed JWT (HS256) with 15-minute expiry (`ACCESS_TOKEN_EXPIRE_MINUTES = 15`).
  - Standard RFC 7519 claims: `sub` (user_id), `email`, `iss` (`asi-telemetry`), `aud` (`asi-telemetry-api`), `iat`, `exp`, `jti`, `type` (`access`).
  - Strict validation of signature, expiry, issuer, and audience.
- **Refresh Token & Rotation**:
  - High-entropy opaque string (`asi_rf_...`, 48 bytes URL-safe).
  - 30-day expiry (`REFRESH_TOKEN_EXPIRE_DAYS = 30`).
  - Only SHA-256 hash stored in ClickHouse / in-memory cache (`refresh_tokens` table).
  - **Rotation**: Every successful refresh invalidates the old refresh token and issues a new one.
  - **Reuse Detection**: If an already replaced or revoked refresh token is presented, the backend identifies token reuse and immediately revokes the entire `family_id`, neutralizing compromised sessions.
  - **Logout**: Explicit revocation invalidates the token family and terminates active sessions.

## 10. Frontend & Agent Integration

The Next.js frontend and ASI1 Agent communicate via these application tokens:
1. Agent stores tokens in memory only (`AccountLinkStore`).
2. When telemetry queries receive `401 Unauthorized`, the agent automatically calls `/api/auth/refresh` to renew the access token and retries once.
3. If refresh fails (revoked or expired), the session drops and the agent prompts the developer to reconnect via Google sign-in.
4. HTTP 403 Forbidden is treated as an authorization failure and does NOT trigger token refresh.

