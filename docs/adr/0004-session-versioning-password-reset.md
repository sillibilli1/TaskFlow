# ADR 0004: Session Versioning for Immediate Multi-Device Token Invalidation

- **Status**: Accepted
- **Date**: 2026-09-01
- **Deciders**: Engineering Lead / Security Architect

---

## Context

TaskFlow uses stateless JSON Web Tokens (JWT) for user authentication (`access_token` with 15-minute expiration) and hashed database refresh tokens (`refresh_token` with 30-day expiration).

When a user triggers a password reset (e.g. after suspecting account compromise or forgetting credentials), security best practices dictate that **all active sessions across all devices must be invalidated immediately**.

Common approaches for invalidating JWTs include:

1. Short expiration times without immediate revocation (insecure for compromised accounts).
2. Distributed Redis blocklists containing revoked JTI (JWT ID) claims (high memory usage, required Redis lookups on every request).
3. Monotonically increasing database session counters (`session_version`).

---

## Decision

We chose **Monotonic Session Versioning** (`session_version`) embedded in both the user's database record and JWT payload.

### Implementation:

1. The `users` table contains an integer column: `session_version INT NOT NULL DEFAULT 1`.
2. When an `access_token` is minted:
   ```ts
   const payload = {
     sub: user.id,
     email: user.email,
     sessionVersion: user.session_version,
   };
   ```
3. During request authentication in `AuthGuard`:
   - The token signature and expiration are verified.
   - The service compares `token.sessionVersion` with the user's cached or active `user.session_version`.
4. When a user changes or resets their password:
   ```sql
   UPDATE users
   SET password_hash = $1,
       session_version = session_version + 1,
       verification_token_hash = NULL
   WHERE id = $2;

   -- Revoke all stored refresh tokens for this user
   DELETE FROM refresh_tokens WHERE user_id = $2;
   ```
5. Any JWT minted before the password reset contains an older `sessionVersion` and is immediately rejected with HTTP 401 Unauthorized across all active browser sessions, mobile devices, and API clients.

---

## Alternatives Considered

### Redis-Backed JTI Denylist / Blocklist

- **Pros**: Can revoke individual single-device tokens without affecting other devices.
- **Cons**:
  - Every incoming authenticated request must make an asynchronous network hop to Redis to check if the `jti` is blocklisted.
  - If Redis experiences network degradation or downtime, authentication either fails completely (fail-closed) or permits revoked tokens (fail-open).
  - Consumes Redis memory storing revoked token IDs until their natural expiration.

---

## Consequences

- **Positive**:
  - **O(1) Instant Global Revocation**: A single SQL atomic integer increment immediately renders every existing access token invalid across all devices.
  - **Zero Extra Redis Storage**: No memory overhead tracking millions of revoked JWT tokens in Redis.
  - **Stateless Token Verification**: Authentication remains predominantly local CPU cryptographic operations without remote network lookups on every request.
- **Negative**:
  - Cannot revoke a single device session while preserving other active sessions (all sessions are revoked simultaneously on password reset).
