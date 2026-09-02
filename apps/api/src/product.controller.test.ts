import { strict as assert } from "node:assert";
import { test } from "node:test";
import { ProductController } from "./product.controller";

const service = {
  projects: async (...args: unknown[]) => args,
  project: async (...args: unknown[]) => args,
  createProject: async (...args: unknown[]) => args,
  updateProject: async (...args: unknown[]) => args,
  deleteProject: async (...args: unknown[]) => args,
  tasks: async (...args: unknown[]) => args,
  createTask: async (...args: unknown[]) => args,
  updateTask: async (...args: unknown[]) => args,
  deleteTask: async (...args: unknown[]) => args,
  comments: async (...args: unknown[]) => args,
  createComment: async (...args: unknown[]) => args,
  activity: async (...args: unknown[]) => args,
} as any;

test("product controller forwards workspace, actor, payload, and query values", async () => {
  const controller = new ProductController(service);
  const request = { user: { id: "user-a", email: "a@example.com" } } as any;
  assert.deepEqual(
    await controller.createProject("workspace-a", request, { name: "Project" }),
    ["workspace-a", request.user, { name: "Project" }],
  );
  assert.deepEqual(
    await controller.createTask("workspace-a", "project-a", request, {
      title: "Task",
    }),
    ["workspace-a", "project-a", request.user, { title: "Task" }],
  );
  assert.deepEqual(
    await controller.tasks("workspace-a", "project-a", {
      status: "done",
      limit: 2,
    } as any),
    ["workspace-a", "project-a", { status: "done", limit: 2 }],
  );
  assert.deepEqual(
    await controller.comments("workspace-a", "task-a", "cursor-a", "3"),
    ["workspace-a", "task-a", "cursor-a", 3],
  );
  assert.deepEqual(await controller.activity("workspace-a", "cursor-a", "3"), [
    "workspace-a",
    "cursor-a",
    3,
  ]);
});
