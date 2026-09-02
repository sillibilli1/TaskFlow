import {
  Body,
  Controller,
  Delete,
  Get,
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
  CreateCommentDto,
  CreateProjectDto,
  CreateTaskDto,
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
  @Post("projects") @Roles(...write) createProject(
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
  @Post("projects/:projectId/tasks") @Roles(...write) createTask(
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
  @Post("tasks/:taskId/comments") @Roles(...write) createComment(
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
}
