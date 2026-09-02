import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "./db.service";
import { AuthRequest } from "./guards";
import {
  CreateCommentDto,
  CreateProjectDto,
  CreateTaskDto,
  TaskQueryDto,
  UpdateProjectDto,
  UpdateTaskDto,
} from "./product.dtos";

@Injectable()
export class ProductService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  private page(limit: number | undefined) {
    return Math.min(Math.max(Number(limit) || 20, 1), 100);
  }
  private async event(
    workspaceId: string,
    actorId: string,
    entityType: string,
    entityId: string,
    action: string,
    metadata = {},
  ) {
    await this.db.query(
      "INSERT INTO activity_events (workspace_id,actor_id,entity_type,entity_id,action,metadata) VALUES ($1,$2,$3,$4,$5,$6)",
      [workspaceId, actorId, entityType, entityId, action, metadata],
    );
  }
  async projects(workspaceId: string, cursor?: string, limit?: number) {
    const take = this.page(limit);
    const values: unknown[] = [workspaceId, take + 1];
    const condition = cursor ? (values.push(cursor), "AND p.id < $3") : "";
    const rows = await this.db.query(
      `SELECT p.* FROM projects p WHERE p.workspace_id=$1 ${condition} ORDER BY p.id DESC LIMIT $2`,
      values,
    );
    const items = rows.rows.slice(0, take);
    return {
      items,
      nextCursor: rows.rows.length > take ? (items.at(-1)?.id ?? null) : null,
    };
  }
  async project(workspaceId: string, id: string) {
    const row = (
      await this.db.query(
        "SELECT * FROM projects WHERE workspace_id=$1 AND id=$2",
        [workspaceId, id],
      )
    ).rows[0];
    if (!row) throw new NotFoundException("Project not found");
    return row;
  }
  async createProject(
    workspaceId: string,
    actor: AuthRequest["user"],
    dto: CreateProjectDto,
  ) {
    const row = (
      await this.db.query(
        "INSERT INTO projects (workspace_id,name,description,created_by) VALUES ($1,$2,$3,$4) RETURNING *",
        [
          workspaceId,
          dto.name.trim(),
          dto.description?.trim() ?? "",
          actor!.id,
        ],
      )
    ).rows[0];
    await this.event(workspaceId, actor!.id, "project", row.id, "created");
    return row;
  }
  async updateProject(
    workspaceId: string,
    actor: AuthRequest["user"],
    id: string,
    dto: UpdateProjectDto,
  ) {
    const row = (
      await this.db.query(
        "UPDATE projects SET name=COALESCE($3,name),description=COALESCE($4,description),updated_at=now() WHERE workspace_id=$1 AND id=$2 RETURNING *",
        [workspaceId, id, dto.name?.trim(), dto.description?.trim()],
      )
    ).rows[0];
    if (!row) throw new NotFoundException("Project not found");
    await this.event(workspaceId, actor!.id, "project", id, "updated");
    return row;
  }
  async deleteProject(
    workspaceId: string,
    actor: AuthRequest["user"],
    id: string,
  ) {
    const result = await this.db.query(
      "DELETE FROM projects WHERE workspace_id=$1 AND id=$2 RETURNING id",
      [workspaceId, id],
    );
    if (!result.rowCount) throw new NotFoundException("Project not found");
    await this.event(workspaceId, actor!.id, "project", id, "deleted");
    return { id };
  }
  async tasks(workspaceId: string, projectId: string, query: TaskQueryDto) {
    const take = this.page(query.limit),
      values: unknown[] = [workspaceId, projectId];
    const conditions = ["t.workspace_id=$1", "t.project_id=$2"];
    if (query.cursor) {
      values.push(query.cursor);
      conditions.push(`t.id < $${values.length}`);
    }
    if (query.status) {
      values.push(query.status);
      conditions.push(`t.status = $${values.length}`);
    }
    if (query.priority) {
      values.push(query.priority);
      conditions.push(`t.priority = $${values.length}`);
    }
    if (query.assigneeId) {
      values.push(query.assigneeId);
      conditions.push(`t.assignee_id = $${values.length}`);
    }
    if (query.dueBefore) {
      values.push(query.dueBefore);
      conditions.push(`t.due_date <= $${values.length}`);
    }
    if (query.dueAfter) {
      values.push(query.dueAfter);
      conditions.push(`t.due_date >= $${values.length}`);
    }
    if (query.labelId) {
      values.push(query.labelId);
      conditions.push(
        `EXISTS (SELECT 1 FROM task_labels tl WHERE tl.task_id=t.id AND tl.workspace_id=$1 AND tl.label_id = $${values.length})`,
      );
    }
    if (query.search) {
      values.push(query.search);
      conditions.push(
        `to_tsvector('simple', coalesce(t.title,'') || ' ' || coalesce(t.description,'')) @@ plainto_tsquery('simple', $${values.length})`,
      );
    }
    values.push(take + 1);
    const rows = await this.db.query(
      `SELECT t.* FROM tasks t WHERE ${conditions.join(" AND ")} ORDER BY t.id DESC LIMIT $${values.length}`,
      values,
    );
    const items = rows.rows.slice(0, take);
    return {
      items,
      nextCursor: rows.rows.length > take ? (items.at(-1)?.id ?? null) : null,
    };
  }
  async createTask(
    workspaceId: string,
    projectId: string,
    actor: AuthRequest["user"],
    dto: CreateTaskDto,
  ) {
    const row = (
      await this.db.query(
        "INSERT INTO tasks (workspace_id,project_id,title,description,status,priority,assignee_id,due_date,created_by) SELECT $1,$2,$3,$4,COALESCE($5,'todo'),COALESCE($6,'medium'),$7,$8,$9 WHERE EXISTS (SELECT 1 FROM projects WHERE id=$2 AND workspace_id=$1) RETURNING *",
        [
          workspaceId,
          projectId,
          dto.title.trim(),
          dto.description?.trim() ?? "",
          dto.status,
          dto.priority,
          dto.assigneeId,
          dto.dueDate,
          actor!.id,
        ],
      )
    ).rows[0];
    if (!row) throw new NotFoundException("Project not found");
    await this.event(workspaceId, actor!.id, "task", row.id, "created");
    return row;
  }
  async task(workspaceId: string, id: string) {
    const row = (
      await this.db.query(
        "SELECT * FROM tasks WHERE workspace_id=$1 AND id=$2",
        [workspaceId, id],
      )
    ).rows[0];
    if (!row) throw new NotFoundException("Task not found");
    return row;
  }

  async updateTask(
    workspaceId: string,
    actor: AuthRequest["user"],
    id: string,
    dto: UpdateTaskDto,
  ) {
    const row = (
      await this.db.query(
        "UPDATE tasks SET title=CASE WHEN $3 THEN $4 ELSE title END,description=CASE WHEN $5 THEN $6 ELSE description END,status=CASE WHEN $7 THEN $8 ELSE status END,priority=CASE WHEN $9 THEN $10 ELSE priority END,assignee_id=CASE WHEN $11 THEN $12::uuid ELSE assignee_id END,due_date=CASE WHEN $13 THEN $14::date ELSE due_date END,updated_at=now() WHERE workspace_id=$1 AND id=$2 RETURNING *",
        [
          workspaceId,
          id,
          dto.title !== undefined,
          dto.title?.trim(),
          dto.description !== undefined,
          dto.description?.trim(),
          dto.status !== undefined,
          dto.status,
          dto.priority !== undefined,
          dto.priority,
          dto.assigneeId !== undefined,
          dto.assigneeId,
          dto.dueDate !== undefined,
          dto.dueDate,
        ],
      )
    ).rows[0];
    if (!row) throw new NotFoundException("Task not found");
    await this.event(
      workspaceId,
      actor!.id,
      "task",
      id,
      dto.status !== undefined ? "status_changed" : "updated",
    );
    return row;
  }
  async deleteTask(
    workspaceId: string,
    actor: AuthRequest["user"],
    id: string,
  ) {
    const r = await this.db.query(
      "DELETE FROM tasks WHERE workspace_id=$1 AND id=$2 RETURNING id",
      [workspaceId, id],
    );
    if (!r.rowCount) throw new NotFoundException("Task not found");
    await this.event(workspaceId, actor!.id, "task", id, "deleted");
    return { id };
  }
  async comments(
    workspaceId: string,
    taskId: string,
    cursor?: string,
    limit?: number,
  ) {
    const take = this.page(limit),
      values: unknown[] = [workspaceId, taskId];
    const condition = cursor
      ? (values.push(cursor), `AND c.id > $${values.length}`)
      : "";
    values.push(take + 1);
    const rows = await this.db.query(
      `SELECT c.* FROM comments c WHERE c.workspace_id=$1 AND c.task_id=$2 ${condition} ORDER BY c.id ASC LIMIT $${values.length}`,
      values,
    );
    const items = rows.rows.slice(0, take);
    return {
      items,
      nextCursor: rows.rows.length > take ? (items.at(-1)?.id ?? null) : null,
    };
  }
  async createComment(
    workspaceId: string,
    taskId: string,
    actor: AuthRequest["user"],
    dto: CreateCommentDto,
  ) {
    const row = (
      await this.db.query(
        "INSERT INTO comments (workspace_id,task_id,author_id,body) SELECT $1,$2,$3,$4 WHERE EXISTS (SELECT 1 FROM tasks WHERE id=$2 AND workspace_id=$1) RETURNING *",
        [workspaceId, taskId, actor!.id, dto.body.trim()],
      )
    ).rows[0];
    if (!row) throw new NotFoundException("Task not found");
    await this.event(workspaceId, actor!.id, "comment", row.id, "created");
    return row;
  }
  async activity(workspaceId: string, cursor?: string, limit?: number) {
    const take = this.page(limit),
      values: unknown[] = [workspaceId];
    const condition = cursor
      ? (values.push(cursor), `AND id < $${values.length}`)
      : "";
    values.push(take + 1);
    const rows = await this.db.query(
      `SELECT * FROM activity_events WHERE workspace_id=$1 ${condition} ORDER BY id DESC LIMIT $${values.length}`,
      values,
    );
    const items = rows.rows.slice(0, take);
    return {
      items,
      nextCursor: rows.rows.length > take ? (items.at(-1)?.id ?? null) : null,
    };
  }
}
