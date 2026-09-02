import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
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
import { CreateWorkspaceDto, InviteDto, TokenDto } from "./dtos";
import { WorkspaceService } from "./workspace.service";

@Controller("workspaces")
export class WorkspaceController {
  constructor(
    @Inject(WorkspaceService) private readonly workspaces: WorkspaceService,
  ) {}
  @Post() @UseGuards(AuthGuard) @HttpCode(201) create(
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
  @Get(":workspaceId/members")
  @UseGuards(AuthGuard, WorkspaceGuard, RoleGuard)
  @Roles("owner", "admin", "member", "viewer")
  members(@Param("workspaceId") workspaceId: string) {
    return this.workspaces.members(workspaceId);
  }
  @Post(":workspaceId/invitations")
  @UseGuards(AuthGuard, WorkspaceGuard, RoleGuard)
  @Roles("owner", "admin")
  @HttpCode(201)
  invite(
    @Param("workspaceId") workspaceId: string,
    @Req() req: AuthRequest,
    @Body() dto: InviteDto,
  ) {
    return this.workspaces.invite(workspaceId, req.user, dto);
  }
  @Post("invitations/accept") @UseGuards(AuthGuard) @HttpCode(201) accept(
    @Req() req: AuthRequest,
    @Body() dto: TokenDto,
  ) {
    return this.workspaces.accept(dto.token, req.user!.id);
  }
}
