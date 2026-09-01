import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  AuthRequest,
  AuthGuard,
  RoleGuard,
  Roles,
  WorkspaceGuard,
} from "./guards";
import { CreateWorkspaceDto, InviteDto } from "./dtos";
import { WorkspaceService } from "./workspace.service";

@Controller("workspaces")
export class WorkspaceController {
  constructor(private readonly workspaces: WorkspaceService) {}
  @Post() @UseGuards(AuthGuard) create(
    @Req() req: AuthRequest,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspaces.create(req.user!.id, dto);
  }
  @Get() @UseGuards(AuthGuard) list(
    @Req() req: AuthRequest,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    return this.workspaces.list(req.user!.id, cursor, Number(limit ?? 20));
  }
  @Post(":workspaceId/invitations")
  @UseGuards(AuthGuard, WorkspaceGuard, RoleGuard)
  @Roles("owner", "admin")
  invite(
    @Param("workspaceId") workspaceId: string,
    @Req() req: AuthRequest,
    @Body() dto: InviteDto,
  ) {
    return this.workspaces.invite(workspaceId, req.user, dto);
  }
  @Post("invitations/accept") @UseGuards(AuthGuard) accept(
    @Req() req: AuthRequest,
    @Body("token") token: string,
  ) {
    return this.workspaces.accept(token, req.user!.id);
  }
}
