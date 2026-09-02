import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  AuthGuard,
  AuthRequest,
  RoleGuard,
  Roles,
  WorkspaceGuard,
} from "./guards";
import {
  CompleteAttachmentDto,
  CreateCommentDto,
  CreateLabelDto,
  CreateProjectDto,
  CreateTaskDto,
  PresignAttachmentDto,
  TaskQueryDto,
  UpdateProjectDto,
  UpdateTaskDto,
} from "./product.dtos";
import { ProductService } from "./product.service";

const read = ["owner", "admin", "member", "viewer"] as const;
const write = ["owner", "admin", "member"] as const;
@Controller("workspaces/:workspaceId")
@UseGuards(AuthGuard, WorkspaceGuard, RoleGuard)
export class ProductController {
  constructor(
    @Inject(ProductService) private readonly products: ProductService,
  ) {}
  @Get("projects") @Roles(...read) projects(
    @Param("workspaceId") w: string,
    @Query("cursor") c?: string,
    @Query("limit") l?: string,
  ) {
    return this.products.projects(w, c, Number(l));
  }
  @Get("projects/:projectId") @Roles(...read) project(
    @Param("workspaceId") w: string,
    @Param("projectId") id: string,
  ) {
    return this.products.project(w, id);
  }
  @Post("projects") @Roles(...write) @HttpCode(201) createProject(
    @Param("workspaceId") w: string,
    @Req() r: AuthRequest,
    @Body() d: CreateProjectDto,
  ) {
    return this.products.createProject(w, r.user, d);
  }
  @Patch("projects/:projectId") @Roles(...write) updateProject(
    @Param("workspaceId") w: string,
    @Param("projectId") id: string,
    @Req() r: AuthRequest,
    @Body() d: UpdateProjectDto,
  ) {
    return this.products.updateProject(w, r.user, id, d);
  }
  @Delete("projects/:projectId") @Roles(...write) deleteProject(
    @Param("workspaceId") w: string,
    @Param("projectId") id: string,
    @Req() r: AuthRequest,
  ) {
    return this.products.deleteProject(w, r.user, id);
  }
  @Get("projects/:projectId/tasks") @Roles(...read) tasks(
    @Param("workspaceId") w: string,
    @Param("projectId") p: string,
    @Query() q: TaskQueryDto,
  ) {
    return this.products.tasks(w, p, q);
  }
  @Post("projects/:projectId/tasks") @Roles(...write) @HttpCode(201) createTask(
    @Param("workspaceId") w: string,
    @Param("projectId") p: string,
    @Req() r: AuthRequest,
    @Body() d: CreateTaskDto,
  ) {
    return this.products.createTask(w, p, r.user, d);
  }
  @Get("tasks/:taskId") @Roles(...read) task(
    @Param("workspaceId") w: string,
    @Param("taskId") id: string,
  ) {
    return this.products.task(w, id);
  }
  @Patch("tasks/:taskId") @Roles(...write) updateTask(
    @Param("workspaceId") w: string,
    @Param("taskId") id: string,
    @Req() r: AuthRequest,
    @Body() d: UpdateTaskDto,
  ) {
    return this.products.updateTask(w, r.user, id, d);
  }
  @Delete("tasks/:taskId") @Roles(...write) deleteTask(
    @Param("workspaceId") w: string,
    @Param("taskId") id: string,
    @Req() r: AuthRequest,
  ) {
    return this.products.deleteTask(w, r.user, id);
  }
  @Get("tasks/:taskId/comments") @Roles(...read) comments(
    @Param("workspaceId") w: string,
    @Param("taskId") t: string,
    @Query("cursor") c?: string,
    @Query("limit") l?: string,
  ) {
    return this.products.comments(w, t, c, Number(l));
  }
  @Post("tasks/:taskId/comments") @Roles(...write) @HttpCode(201) createComment(
    @Param("workspaceId") w: string,
    @Param("taskId") t: string,
    @Req() r: AuthRequest,
    @Body() d: CreateCommentDto,
  ) {
    return this.products.createComment(w, t, r.user, d);
  }
  @Get("activity-events") @Roles(...read) activity(
    @Param("workspaceId") w: string,
    @Query("cursor") c?: string,
    @Query("limit") l?: string,
  ) {
    return this.products.activity(w, c, Number(l));
  }
  @Get("audit-events") @Roles(...read) audit(
    @Param("workspaceId") w: string,
    @Query("cursor") c?: string,
    @Query("limit") l?: string,
  ) {
    return this.products.activity(w, c, Number(l));
  }
  @Get("labels") @Roles(...read) labels(@Param("workspaceId") w: string) {
    return this.products.labels(w);
  }
  @Post("labels") @Roles(...write) @HttpCode(201) createLabel(
    @Param("workspaceId") w: string,
    @Req() r: AuthRequest,
    @Body() d: CreateLabelDto,
  ) {
    return this.products.createLabel(w, r.user, d);
  }
  @Get("tasks/:taskId/attachments") @Roles(...read) attachments(
    @Param("workspaceId") w: string,
    @Param("taskId") t: string,
  ) {
    return this.products.attachments(w, t);
  }
  @Post("tasks/:taskId/attachments/presign")
  @Roles(...write)
  @HttpCode(201)
  presignAttachment(
    @Param("workspaceId") w: string,
    @Param("taskId") t: string,
    @Req() r: AuthRequest,
    @Body() d: PresignAttachmentDto,
  ) {
    return this.products.presignAttachment(w, t, r.user, d);
  }
  @Post("tasks/:taskId/attachments/complete")
  @Roles(...write)
  @HttpCode(201)
  completeAttachment(
    @Param("workspaceId") w: string,
    @Param("taskId") t: string,
    @Req() r: AuthRequest,
    @Body() d: CompleteAttachmentDto,
  ) {
    return this.products.completeAttachment(w, t, r.user, d);
  }
  @Get("tasks/:taskId/attachments/:attachmentId/download")
  @Roles(...read)
  downloadAttachment(
    @Param("workspaceId") w: string,
    @Param("taskId") t: string,
    @Param("attachmentId") id: string,
  ) {
    return this.products.downloadAttachment(w, t, id);
  }
  @Get("notifications") @Roles(...read) notifications(
    @Param("workspaceId") w: string,
    @Req() r: AuthRequest,
    @Query("cursor") c?: string,
    @Query("limit") l?: string,
  ) {
    return this.products.notifications(w, r.user!.id, c, Number(l));
  }
  @Post("notifications/:notificationId/read") @Roles(...read) readNotification(
    @Param("workspaceId") w: string,
    @Param("notificationId") id: string,
    @Req() r: AuthRequest,
  ) {
    return this.products.markNotificationRead(w, r.user!.id, id);
  }
}
