import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes, createHash } from "node:crypto";
import { DatabaseService } from "./db.service";
import { InviteDto, CreateWorkspaceDto } from "./dtos";
import { AuthRequest, Role } from "./guards";
import { sendLocalEmail } from "./email.service";

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

@Injectable()
export class WorkspaceService {
  constructor(private readonly db: DatabaseService) {}

  async create(userId: string, dto: CreateWorkspaceDto) {
    return this.db.transaction(async (client) => {
      const workspace = (
        await client.query<{ id: string; name: string }>(
          "INSERT INTO workspaces (name, created_by) VALUES ($1,$2) RETURNING id,name",
          [dto.name.trim(), userId],
        )
      ).rows[0];
      await client.query(
        "INSERT INTO workspace_members (workspace_id,user_id,role,joined_at) VALUES ($1,$2,'owner',now())",
        [workspace.id, userId],
      );
      return workspace;
    });
  }

  async invite(
    workspaceId: string,
    actor: AuthRequest["user"],
    dto: InviteDto,
  ) {
    if (!actor) throw new ForbiddenException("Authentication required");
    const membership = await this.getMembership(workspaceId, actor.id);
    if (!membership || !["owner", "admin"].includes(membership.role))
      throw new ForbiddenException("Insufficient workspace role");
    const email = dto.email.trim().toLowerCase();
    const raw = randomBytes(32).toString("hex");
    const result = await this.db.query<{ id: string; expires_at: Date }>(
      "INSERT INTO workspace_invitations (workspace_id,email,role,token_hash,expires_at,invited_by) VALUES ($1,$2,$3,$4,now()+interval '7 days',$5) RETURNING id,expires_at",
      [workspaceId, email, dto.role, digest(raw), actor.id],
    );
    void sendLocalEmail("workspace-invite", email, raw);
    return {
      id: result.rows[0].id,
      email,
      role: dto.role,
      expiresAt: result.rows[0].expires_at,
      inviteToken: raw,
    };
  }

  async accept(raw: string, userId: string) {
    return this.db.transaction(async (client) => {
      const invitation = (
        await client.query<{
          id: string;
          workspace_id: string;
          email: string;
          role: Role;
        }>(
          "SELECT id,workspace_id,email,role FROM workspace_invitations WHERE token_hash=$1 AND expires_at>now() AND accepted_at IS NULL AND revoked_at IS NULL",
          [digest(raw)],
        )
      ).rows[0];
      if (!invitation)
        throw new NotFoundException("Invitation is invalid or expired");
      const user = (
        await client.query<{ email: string }>(
          "SELECT email FROM users WHERE id=$1",
          [userId],
        )
      ).rows[0];
      if (!user || user.email.toLowerCase() !== invitation.email)
        throw new ForbiddenException("Invitation email does not match account");
      await client.query(
        "INSERT INTO workspace_members (workspace_id,user_id,role,joined_at) VALUES ($1,$2,$3,now()) ON CONFLICT (workspace_id,user_id) DO UPDATE SET role=EXCLUDED.role, joined_at=now()",
        [invitation.workspace_id, userId, invitation.role],
      );
      await client.query(
        "UPDATE workspace_invitations SET accepted_at=now() WHERE id=$1",
        [invitation.id],
      );
      return { workspaceId: invitation.workspace_id, role: invitation.role };
    });
  }

  async list(userId: string, cursor?: string, limit = 20) {
    const safeLimit = Math.min(Math.max(limit || 20, 1), 100);
    const values: unknown[] = [userId, safeLimit + 1];
    let condition = "";
    if (cursor) {
      values.push(cursor);
      condition = "AND w.id < $3";
    }
    const rows = await this.db.query<{
      id: string;
      name: string;
      role: Role;
      created_at: Date;
    }>(
      `SELECT w.id,w.name,wm.role,w.created_at FROM workspaces w JOIN workspace_members wm ON wm.workspace_id=w.id WHERE wm.user_id=$1 AND wm.joined_at IS NOT NULL ${condition} ORDER BY w.id DESC LIMIT $2`,
      values,
    );
    const hasNext = rows.rows.length > safeLimit;
    const items = rows.rows.slice(0, safeLimit);
    return { items, nextCursor: hasNext ? (items.at(-1)?.id ?? null) : null };
  }

  async getMembership(workspaceId: string, userId: string) {
    const result = await this.db.query<{ role: Role }>(
      "SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2 AND joined_at IS NOT NULL",
      [workspaceId, userId],
    );
    return result.rows[0] ?? null;
  }
}
