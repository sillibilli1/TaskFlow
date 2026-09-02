import { strict as assert } from "node:assert";
import { test } from "node:test";
import { NotFoundException } from "@nestjs/common";
import { ProductService } from "./product.service";

const actor = { id: "user-a", email: "a@example.com" };

function database(responses: unknown[]) {
  const calls: { sql: string; values: unknown[] }[] = [];
  return {
    calls,
    db: {
      query: async (sql: string, values: unknown[] = []) => {
        calls.push({ sql, values });
        return (responses.shift() ?? { rows: [], rowCount: 0 }) as any;
      },
    } as any,
  };
}

test("project CRUD is workspace-scoped and records activity", async () => {
  const project = { id: "project-a", name: "Roadmap" };
  const { db, calls } = database([
    { rows: [project], rowCount: 1 },
    { rows: [], rowCount: 1 },
    { rows: [project], rowCount: 1 },
    { rows: [], rowCount: 1 },
    { rows: [{ id: project.id }], rowCount: 1 },
    { rows: [], rowCount: 1 },
  ]);
  const service = new ProductService(db);

  await service.createProject("workspace-a", actor, { name: " Roadmap " });
  await service.updateProject("workspace-a", actor, project.id, {
    name: "Updated",
  });
  await service.deleteProject("workspace-a", actor, project.id);

  assert.deepEqual(calls[0].values, ["workspace-a", "Roadmap", "", "user-a"]);
  assert.match(calls[2].sql, /workspace_id=\$1 AND id=\$2/);
  assert.deepEqual(calls[4].values, ["workspace-a", project.id]);
  assert.match(calls[5].sql, /activity_events/);
});

test("task listing applies filters and cursor pagination", async () => {
  const { db, calls } = database([
    { rows: [{ id: "task-a" }, { id: "task-b" }], rowCount: 2 },
  ]);
  const service = new ProductService(db);
  const result = await service.tasks("workspace-a", "project-a", {
    cursor: "task-z",
    limit: 1,
    status: "done",
    priority: "high",
    assigneeId: "user-a",
    dueBefore: "2026-10-01",
    dueAfter: "2026-01-01",
    labelId: "label-a",
    search: "launch",
  });

  assert.deepEqual(result, { items: [{ id: "task-a" }], nextCursor: "task-a" });
  assert.match(calls[0].sql, /t\.id < \$3/);
  assert.match(calls[0].sql, /t\.status/);
  assert.match(calls[0].sql, /t\.priority/);
  assert.match(calls[0].sql, /t\.assignee_id/);
  assert.match(calls[0].sql, /t\.due_date <\=/);
  assert.match(calls[0].sql, /t\.due_date >\=/);
  assert.match(calls[0].sql, /task_labels/);
  assert.match(calls[0].sql, /plainto_tsquery/);
});

test("task and comment writes are scoped and emit activity", async () => {
  const task = { id: "task-a" };
  const comment = { id: "comment-a" };
  const { db, calls } = database([
    { rows: [task], rowCount: 1 },
    { rows: [], rowCount: 1 },
    { rows: [task], rowCount: 1 },
    { rows: [], rowCount: 1 },
    { rows: [comment], rowCount: 1 },
    { rows: [], rowCount: 1 },
  ]);
  const service = new ProductService(db);
  await service.createTask("workspace-a", "project-a", actor, {
    title: "Build",
  });
  await service.updateTask("workspace-a", actor, task.id, { status: "done" });
  await service.createComment("workspace-a", task.id, actor, {
    body: "Ship it",
  });

  assert.match(calls[0].sql, /WHERE EXISTS.*projects/s);
  assert.match(calls[2].sql, /workspace_id=\$1 AND id=\$2/);
  assert.match(calls[4].sql, /WHERE EXISTS.*tasks/s);
  assert.equal(
    calls.filter((call) => call.sql.includes("activity_events")).length,
    3,
  );
});

test("missing product records return not found", async () => {
  const { db } = database([{ rows: [], rowCount: 0 }]);
  const service = new ProductService(db);
  await assert.rejects(
    () => service.project("workspace-b", "project-a"),
    NotFoundException,
  );
});
