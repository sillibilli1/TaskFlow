import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "./db.service";
import { AuthRequest } from "./guards";
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
import { QueueService } from "./queue.service";
import { StorageService } from "./storage.service";
import { sanitizeFilename, validateAttachment } from "./attachment.util";

@Injectable()
export class ProductService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(QueueService) private readonly queue: QueueService,
  ) {}
  private page(limit: number | undefined) {
    return Math.min(Math.max(Number(limit) || 20, 1), 100);
  }
  private async event(
    workspaceId: string,
    actorId: string,
    entityType: string,
    entityId: string,
    action: string,
    metadata: Record<string, unknown> = {},
  ) {
    await this.db.query(
      "INSERT INTO activity_events (workspace_id,actor_id,entity_type,entity_id,action,metadata) VALUES ($1,$2,$3,$4,$5,$6)",
      [workspaceId, actorId, entityType, entityId, action, metadata],
    );
  }
  private async notify(
    workspaceId: string,
    userId: string | null | undefined,
    actorId: string,
    type: string,
    title: string,
    body: string,
    entityType?: string,
    entityId?: string,
  ) {
    if (!userId || userId === actorId) return;
    await this.db.query(
      "INSERT INTO notifications (workspace_id,user_id,type,title,body,entity_type,entity_id) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [
        workspaceId,
        userId,
        type,
        title,
        body,
        entityType ?? null,
        entityId ?? null,
      ],
    );
    const recipient = (
      await this.db.query<{ email: string }>(
        "SELECT email FROM users WHERE id=$1",
        [userId],
      )
    ).rows[0];
    if (recipient?.email) {
      await this.queue.enqueueEmail({
        kind: type,
        email: recipient.email,
        subject: title,
        text: body,
      });
    }
  }
  private async attachLabels(
    workspaceId: string,
    taskId: string,
    labelIds?: string[],
  ) {
    if (!labelIds) return;
    await this.db.query(
      "DELETE FROM task_labels WHERE workspace_id=$1 AND task_id=$2",
      [workspaceId, taskId],
    );
    const unique = [...new Set(labelIds)];
    for (const labelId of unique) {
      const inserted = await this.db.query(
        "INSERT INTO task_labels (task_id,label_id,workspace_id) SELECT $1,$2,$3 WHERE EXISTS (SELECT 1 FROM labels WHERE id=$2 AND workspace_id=$3)",
        [taskId, labelId, workspaceId],
      );
      if (!inserted.rowCount)
        throw new BadRequestException("One or more labels were not found");
    }
  }
  private async withLabels(workspaceId: string, tasks: any[]) {
    if (!tasks.length) return tasks;
    const ids = tasks.map((task) => task.id);
    const rows = await this.db.query<{
      task_id: string;
      id: string;
      name: string;
      color: string;
    }>(
      "SELECT tl.task_id,l.id,l.name,l.color FROM task_labels tl JOIN labels l ON l.id=tl.label_id AND l.workspace_id=tl.workspace_id WHERE tl.workspace_id=$1 AND tl.task_id = ANY($2::uuid[])",
      [workspaceId, ids],
    );
    const grouped = new Map<
      string,
      { id: string; name: string; color: string }[]
    >();
    for (const row of rows.rows) {
      const list = grouped.get(row.task_id) ?? [];
      list.push({ id: row.id, name: row.name, color: row.color });
      grouped.set(row.task_id, list);
    }
    return tasks.map((task) => ({
      ...task,
      labels: grouped.get(String(task.id)) ?? [],
    }));
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
    const items = await this.withLabels(workspaceId, rows.rows.slice(0, take));
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
    await this.attachLabels(workspaceId, row.id, dto.labelIds);
    await this.event(workspaceId, actor!.id, "task", row.id, "created");
    if (dto.assigneeId)
      await this.notify(
        workspaceId,
        dto.assigneeId,
        actor!.id,
        "task_assigned",
        "You were assigned a task",
        `You were assigned "${row.title}".`,
        "task",
        row.id,
      );
    const [hydrated] = await this.withLabels(workspaceId, [row]);
    return hydrated;
  }
  async task(workspaceId: string, id: string) {
    const row = (
      await this.db.query(
        "SELECT * FROM tasks WHERE workspace_id=$1 AND id=$2",
        [workspaceId, id],
      )
    ).rows[0];
    if (!row) throw new NotFoundException("Task not found");
    const [hydrated] = await this.withLabels(workspaceId, [row]);
    return hydrated;
  }

  async updateTask(
    workspaceId: string,
    actor: AuthRequest["user"],
    id: string,
    dto: UpdateTaskDto,
  ) {
    const previous = (
      await this.db.query<{ assignee_id: string | null; title: string }>(
        "SELECT assignee_id,title FROM tasks WHERE workspace_id=$1 AND id=$2",
        [workspaceId, id],
      )
    ).rows[0];
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
    if (dto.labelIds) await this.attachLabels(workspaceId, id, dto.labelIds);
    await this.event(
      workspaceId,
      actor!.id,
      "task",
      id,
      dto.status !== undefined ? "status_changed" : "updated",
    );
    if (dto.assigneeId && dto.assigneeId !== previous?.assignee_id)
      await this.notify(
        workspaceId,
        dto.assigneeId,
        actor!.id,
        "task_assigned",
        "You were assigned a task",
        `You were assigned "${row.title}".`,
        "task",
        id,
      );
    const [hydrated] = await this.withLabels(workspaceId, [row]);
    return hydrated;
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
    const task = (
      await this.db.query<{
        assignee_id: string | null;
        created_by: string;
        title: string;
      }>(
        "SELECT assignee_id,created_by,title FROM tasks WHERE workspace_id=$1 AND id=$2",
        [workspaceId, taskId],
      )
    ).rows[0];
    const recipients = new Set(
      [task?.assignee_id, task?.created_by].filter(Boolean) as string[],
    );
    for (const userId of recipients)
      await this.notify(
        workspaceId,
        userId,
        actor!.id,
        "comment_created",
        "New comment on a task",
        `${actor!.email} commented on "${task?.title ?? "a task"}".`,
        "task",
        taskId,
      );
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
  async labels(workspaceId: string) {
    const rows = await this.db.query(
      "SELECT * FROM labels WHERE workspace_id=$1 ORDER BY name ASC",
      [workspaceId],
    );
    return { items: rows.rows };
  }
  async createLabel(
    workspaceId: string,
    actor: AuthRequest["user"],
    dto: CreateLabelDto,
  ) {
    try {
      const row = (
        await this.db.query(
          "INSERT INTO labels (workspace_id,name,color,created_by) VALUES ($1,$2,$3,$4) RETURNING *",
          [
            workspaceId,
            dto.name.trim(),
            dto.color?.trim() || "#64748b",
            actor!.id,
          ],
        )
      ).rows[0];
      await this.event(workspaceId, actor!.id, "label", row.id, "created");
      return row;
    } catch (error: any) {
      if (error.code === "23505")
        throw new BadRequestException("A label with that name already exists");
      throw error;
    }
  }
  async attachments(workspaceId: string, taskId: string) {
    const task = await this.task(workspaceId, taskId);
    const rows = await this.db.query(
      "SELECT id,filename,size_bytes,mime_type,uploaded_by,created_at FROM attachments WHERE workspace_id=$1 AND task_id=$2 ORDER BY created_at DESC",
      [workspaceId, taskId],
    );
    return { items: rows.rows, taskId: task.id };
  }
  async presignAttachment(
    workspaceId: string,
    taskId: string,
    actor: AuthRequest["user"],
    dto: PresignAttachmentDto,
  ) {
    await this.task(workspaceId, taskId);
    const error = validateAttachment(dto.filename, dto.mimeType, dto.size);
    if (error) throw new BadRequestException(error);
    const attachmentId = randomUUID();
    const storageKey = `${workspaceId}/${taskId}/${attachmentId}-${sanitizeFilename(dto.filename)}`;
    const signed = await this.storage.createSignedUploadUrl(storageKey);
    await this.db.query(
      "INSERT INTO attachments (id,workspace_id,task_id,filename,size_bytes,mime_type,storage_key,uploaded_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        attachmentId,
        workspaceId,
        taskId,
        dto.filename.trim(),
        dto.size,
        dto.mimeType,
        storageKey,
        actor!.id,
      ],
    );
    return {
      attachmentId,
      storageKey,
      bucket: this.storage.bucket(),
      token: signed.token,
      path: signed.path,
      signedUrl: signed.signedUrl,
    };
  }
  async completeAttachment(
    workspaceId: string,
    taskId: string,
    actor: AuthRequest["user"],
    dto: CompleteAttachmentDto,
  ) {
    const row = (
      await this.db.query<{
        id: string;
        storage_key: string;
        filename: string;
      }>(
        "SELECT id,storage_key,filename FROM attachments WHERE workspace_id=$1 AND task_id=$2 AND id=$3",
        [workspaceId, taskId, dto.attachmentId],
      )
    ).rows[0];
    if (!row) throw new NotFoundException("Attachment not found");
    const exists = await this.storage.objectExists(row.storage_key);
    if (!exists)
      throw new BadRequestException("Upload was not found in storage");
    await this.event(workspaceId, actor!.id, "attachment", row.id, "created", {
      filename: row.filename,
    });
    return { id: row.id, filename: row.filename };
  }
  async downloadAttachment(
    workspaceId: string,
    taskId: string,
    attachmentId: string,
  ) {
    const row = (
      await this.db.query<{ storage_key: string; filename: string }>(
        "SELECT storage_key,filename FROM attachments WHERE workspace_id=$1 AND task_id=$2 AND id=$3",
        [workspaceId, taskId, attachmentId],
      )
    ).rows[0];
    if (!row) throw new NotFoundException("Attachment not found");
    const signed = await this.storage.createSignedDownloadUrl(row.storage_key);
    return { filename: row.filename, signedUrl: signed.signedUrl };
  }
  async notifications(
    workspaceId: string,
    userId: string,
    cursor?: string,
    limit?: number,
  ) {
    const take = this.page(limit);
    const values: unknown[] = [workspaceId, userId, take + 1];
    const condition = cursor ? (values.push(cursor), "AND id < $4") : "";
    const rows = await this.db.query(
      `SELECT * FROM notifications WHERE workspace_id=$1 AND user_id=$2 ${condition} ORDER BY created_at DESC, id DESC LIMIT $3`,
      values,
    );
    const items = rows.rows.slice(0, take);
    return {
      items,
      nextCursor: rows.rows.length > take ? (items.at(-1)?.id ?? null) : null,
    };
  }
  async markNotificationRead(
    workspaceId: string,
    userId: string,
    notificationId: string,
  ) {
    const row = (
      await this.db.query(
        "UPDATE notifications SET read_at=COALESCE(read_at, now()) WHERE workspace_id=$1 AND user_id=$2 AND id=$3 RETURNING *",
        [workspaceId, userId, notificationId],
      )
    ).rows[0];
    if (!row) throw new NotFoundException("Notification not found");
    return row;
  }
}
