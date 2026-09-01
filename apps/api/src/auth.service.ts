import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import * as jwt from "jsonwebtoken";
import { DatabaseService } from "./db.service";
import { sendLocalEmail } from "./email.service";
import { Role } from "./guards";

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
  constructor(private readonly db: DatabaseService) {}
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
    }>("SELECT id,email,password_hash FROM users WHERE email=$1", [
      email.trim().toLowerCase(),
    ]);
    const user = result.rows[0];
    if (!user || !(await argon2.verify(user.password_hash, password)))
      throw new UnauthorizedException("Invalid email or password");
    return { id: user.id, email: user.email };
  }
  signAccess(user: { id: string; email: string }) {
    return jwt.sign({ sub: user.id, email: user.email }, secret(), {
      expiresIn: "15m",
    });
  }
  async issueRefresh(userId: string, familyId: string = randomUUID()) {
    const raw = randomBytes(48).toString("base64url");
    const result = await this.db.query<{ id: string }>(
      "INSERT INTO refresh_tokens (user_id,token_hash,family_id,expires_at) VALUES ($1,$2,$3,now()+interval '30 days') RETURNING id",
      [userId, hashToken(raw), familyId],
    );
    return { raw, id: result.rows[0].id, familyId };
  }
  verifyAccessToken(token: string) {
    try {
      const payload = jwt.verify(token, secret()) as jwt.JwtPayload;
      if (!payload.sub || typeof payload.email !== "string") throw new Error();
      return { id: String(payload.sub), email: payload.email };
    } catch {
      throw new UnauthorizedException("Invalid or expired session");
    }
  }
  async rotateRefresh(raw: string) {
    const result = await this.db.query<{
      id: string;
      user_id: string;
      family_id: string;
      expires_at: Date;
      revoked_at: Date | null;
    }>(
      "SELECT id,user_id,family_id,expires_at,revoked_at FROM refresh_tokens WHERE token_hash=$1",
      [hashToken(raw)],
    );
    const token = result.rows[0];
    if (!token || token.revoked_at || new Date(token.expires_at) < new Date())
      throw new UnauthorizedException("Invalid refresh token");
    const next = await this.issueRefresh(token.user_id, token.family_id);
    await this.db.query(
      "UPDATE refresh_tokens SET revoked_at=now(), replaced_by=$1 WHERE id=$2",
      [next.id, token.id],
    );
    const user = (
      await this.db.query<{ id: string; email: string }>(
        "SELECT id,email FROM users WHERE id=$1",
        [token.user_id],
      )
    ).rows[0];
    return { user, ...next };
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
      "UPDATE users SET password_hash=$1,password_reset_token_hash=NULL,password_reset_expires_at=NULL WHERE password_reset_token_hash=$2 AND password_reset_expires_at>now() RETURNING id",
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
    void sendLocalEmail(kind, email, raw);
  }
}
export { tokenCookie };
