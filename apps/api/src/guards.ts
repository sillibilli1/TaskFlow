import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { AuthService } from "./auth.service";

export type Role = "owner" | "admin" | "member" | "viewer";
export type AuthRequest = Request & {
  user?: { id: string; email: string };
  membership?: { role: Role };
};
export const Roles = (...roles: Role[]) => SetMetadata("roles", roles);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const token = req.cookies?.access_token;
    if (!token) throw new UnauthorizedException("Authentication required");
    req.user = await this.auth.verifyAccessToken(token);
    return true;
  }
}

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const workspaceParam = req.params.workspaceId;
    const workspaceId = Array.isArray(workspaceParam)
      ? workspaceParam[0]
      : workspaceParam;
    if (!workspaceId || !req.user)
      throw new ForbiddenException("Workspace context required");
    const membership = await this.auth.getMembership(workspaceId, req.user.id);
    if (!membership) throw new ForbiddenException("Workspace access denied");
    req.membership = membership;
    return true;
  }
}

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<Role[]>("roles", [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (!request.membership || !required.includes(request.membership.role))
      throw new ForbiddenException("Insufficient workspace role");
    return true;
  }
}
