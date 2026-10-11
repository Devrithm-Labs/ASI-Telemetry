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
| POST | `/api/metrics` | No | Existing SDK telemetry ingestion |
| POST | `/api/telemetry` | No | Existing alias for telemetry ingestion |
| GET | `/api/dashboard` | No, currently | Existing dashboard data endpoint |
| GET | `/api/health` | No | Existing health status |

Signup and login are public by design: a user cannot be required to be logged in before signing up or logging in.

## 9. Frontend integration outline

The Next.js frontend is separate from this Python API. A frontend login form should:

1. Send JSON to `http://localhost:8080/api/auth/login`.
2. Check `response.ok` before treating login as successful.
3. Keep the access token in memory where possible and attach it as `Authorization: Bearer ${token}` to protected API calls.
4. Handle `401` by asking the user to log in again.

For a production browser app, prefer a backend-for-frontend or secure `HttpOnly`, `Secure`, `SameSite` cookie design rather than storing long-lived credentials in `localStorage`. If using cookies, add CSRF protection and configure CORS to allow only the exact frontend origin. Do not use `allow_origins=["*"]` together with credentials in production.

## 10. Before production / hackathon demo checklist

- [ ] Replace the development JWT secret with a randomly generated secret stored in deployment environment variables.
- [ ] Use persistent storage for SQLite, or move accounts to PostgreSQL if deploying multiple backend instances.
- [ ] Wire the Next.js signup/login screens to these endpoints.
- [ ] Add `Depends(get_current_user)` to dashboard endpoints that should be private, and make sure the frontend sends the token.
- [ ] Keep SDK telemetry ingestion separately authenticated (for example, per-project SDK keys) if public ingestion would allow spam or data poisoning.
- [ ] Restrict CORS to the frontend origin.
- [ ] Add login/signup rate limiting, password reset, email verification, and automated tests.
- [ ] Decide whether access tokens need refresh-token rotation and logout/revocation support.

This is a useful hackathon-ready baseline, not a complete production identity platform.
