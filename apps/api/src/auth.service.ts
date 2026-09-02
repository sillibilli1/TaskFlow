import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import * as jwt from "jsonwebtoken";
import { DatabaseService } from "./db.service";
import { Role } from "./guards";
import { QueueService } from "./queue.service";

const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const secret = () => process.env.SESSION_SECRET ?? "development-only-change-me";
const tokenCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.APP_ENV === "production",
  path: "/",
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(QueueService) private readonly queue: QueueService,
  ) {}
  async register(email: string, password: string) {
    const normalized = email.trim().toLowerCase();
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const raw = randomBytes(32).toString("hex");
    try {
      const result = await this.db.query<{ id: string; email: string }>(
        "INSERT INTO users (email, password_hash, verification_token_hash, verification_expires_at) VALUES ($1,$2,$3,now()+interval '24 hours') RETURNING id,email",
        [normalized, passwordHash, hashToken(raw)],
      );
      this.emitEmail("verification", normalized, raw);
      return result.rows[0];
    } catch (error: any) {
      if (error.code === "23505")
        throw new ConflictException("Email is already registered");
      throw error;
    }
  }
  async validateCredentials(email: string, password: string) {
    const result = await this.db.query<{
      id: string;
      email: string;
      password_hash: string;
      email_verified_at: Date | null;
      session_version: number;
    }>(
      "SELECT id,email,password_hash,email_verified_at,session_version FROM users WHERE email=$1",
      [email.trim().toLowerCase()],
    );
    const user = result.rows[0];
    if (!user || !(await argon2.verify(user.password_hash, password)))
      throw new UnauthorizedException("Invalid email or password");
    if (!user.email_verified_at)
      throw new UnauthorizedException("Email verification is required");
    return {
      id: user.id,
      email: user.email,
      sessionVersion: user.session_version,
    };
  }
  signAccess(user: { id: string; email: string }, sessionVersion = 0) {
    return jwt.sign(
      { sub: user.id, email: user.email, sessionVersion },
      secret(),
      {
        expiresIn: "15m",
      },
    );
  }
  async issueRefresh(userId: string, familyId: string = randomUUID()) {
    const raw = randomBytes(48).toString("base64url");
    const result = await this.db.query<{ id: string }>(
      "INSERT INTO refresh_tokens (user_id,token_hash,family_id,expires_at) VALUES ($1,$2,$3,now()+interval '30 days') RETURNING id",
      [userId, hashToken(raw), familyId],
    );
    return { raw, id: result.rows[0].id, familyId };
  }
  async verifyAccessToken(token: string) {
    try {
      const payload = jwt.verify(token, secret()) as jwt.JwtPayload;
      if (!payload.sub || typeof payload.email !== "string") throw new Error();
      const user = await this.db.query<{ session_version: number }>(
        "SELECT session_version FROM users WHERE id=$1",
        [String(payload.sub)],
      );
      if (
        !user.rows[0] ||
        Number(payload.sessionVersion ?? 0) !== user.rows[0].session_version
      )
        throw new Error();
      return {
        id: String(payload.sub),
        email: payload.email,
        sessionVersion: user.rows[0].session_version,
      };
    } catch {
      throw new UnauthorizedException("Invalid or expired session");
    }
  }
  async rotateRefresh(raw: string) {
    return this.db.transaction(async (client) => {
      const result = await client.query<{
        id: string;
        user_id: string;
        family_id: string;
        expires_at: Date;
        revoked_at: Date | null;
      }>(
        "SELECT id,user_id,family_id,expires_at,revoked_at FROM refresh_tokens WHERE token_hash=$1 FOR UPDATE",
        [hashToken(raw)],
      );
      const token = result.rows[0];
      if (
        !token ||
        token.revoked_at ||
        new Date(token.expires_at) < new Date()
      ) {
        if (token?.family_id)
          await client.query(
            "UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at, now()) WHERE family_id=$1",
            [token.family_id],
          );
        throw new UnauthorizedException("Invalid refresh token");
      }
      const nextRaw = randomBytes(48).toString("base64url");
      const next = (
        await client.query<{ id: string }>(
          "INSERT INTO refresh_tokens (user_id,token_hash,family_id,expires_at) VALUES ($1,$2,$3,now()+interval '30 days') RETURNING id",
          [token.user_id, hashToken(nextRaw), token.family_id],
        )
      ).rows[0];
      await client.query(
        "UPDATE refresh_tokens SET revoked_at=now(), replaced_by=$1 WHERE id=$2 AND revoked_at IS NULL",
        [next.id, token.id],
      );
      const user = (
        await client.query<{
          id: string;
          email: string;
          session_version: number;
        }>("SELECT id,email,session_version FROM users WHERE id=$1", [
          token.user_id,
        ])
      ).rows[0];
      return {
        user: {
          id: user.id,
          email: user.email,
          sessionVersion: user.session_version,
        },
        raw: nextRaw,
        id: next.id,
        familyId: token.family_id,
      };
    });
  }
  async logout(raw?: string) {
    if (raw)
      await this.db.query(
        "UPDATE refresh_tokens SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL",
        [hashToken(raw)],
      );
  }
  async verifyEmail(raw: string) {
    const result = await this.db.query<{ id: string }>(
      "UPDATE users SET email_verified_at=now(), verification_token_hash=NULL, verification_expires_at=NULL WHERE verification_token_hash=$1 AND verification_expires_at>now() RETURNING id",
      [hashToken(raw)],
    );
    if (!result.rowCount)
      throw new BadRequestException("Verification link is invalid or expired");
    return { verified: true };
  }
  async requestPasswordReset(email: string) {
    const raw = randomBytes(32).toString("hex");
    const result = await this.db.query<{ email: string }>(
      "UPDATE users SET password_reset_token_hash=$1,password_reset_expires_at=now()+interval '1 hour' WHERE email=$2 RETURNING email",
      [hashToken(raw), email.trim().toLowerCase()],
    );
    if (result.rowCount)
      this.emitEmail("password-reset", result.rows[0].email, raw);
    return { requested: true };
  }
  async resetPassword(raw: string, password: string) {
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    const result = await this.db.query<{ id: string }>(
      "UPDATE users SET password_hash=$1,password_reset_token_hash=NULL,password_reset_expires_at=NULL,session_version=session_version+1 WHERE password_reset_token_hash=$2 AND password_reset_expires_at>now() RETURNING id",
      [hash, hashToken(raw)],
    );
    if (!result.rowCount)
      throw new BadRequestException("Reset link is invalid or expired");
    await this.db.query(
      "UPDATE refresh_tokens SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
      [result.rows[0].id],
    );
    return { reset: true };
  }
  async getMembership(workspaceId: string, userId: string) {
    const result = await this.db.query<{ role: Role }>(
      "SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2 AND joined_at IS NOT NULL",
      [workspaceId, userId],
    );
    return result.rows[0] ?? null;
  }
  private emitEmail(kind: string, email: string, raw: string) {
    void this.queue.enqueueEmail({ kind, email, token: raw });
  }
}
export { tokenCookie };
