import { strict as assert } from "node:assert";
import { test } from "node:test";
import { WorkspaceService } from "./workspace.service";

test("workspace listing is scoped by authenticated user", async () => {
  const queries: unknown[][] = [];
  const db = {
    query: async (_sql: string, values: unknown[]) => {
      queries.push(values);
      return { rows: [], rowCount: 0 };
    },
  } as any;
  const service = new WorkspaceService(db);
  await service.list("user-a", undefined, 20);
  assert.deepEqual(queries[0], ["user-a", 21]);
});

test("membership lookup always binds workspace and user", async () => {
  const queries: unknown[][] = [];
  const db = {
    query: async (_sql: string, values: unknown[]) => {
      queries.push(values);
      return { rows: [], rowCount: 0 };
    },
  } as any;
  const service = new WorkspaceService(db);
  await service.getMembership("workspace-b", "user-a");
  assert.deepEqual(queries[0], ["workspace-b", "user-a"]);
});
