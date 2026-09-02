import { strict as assert } from "node:assert";
import { test } from "node:test";
import { requestFingerprint } from "./idempotency.interceptor";

test("idempotency fingerprints change when the body changes", () => {
  const path = "/api/v1/workspaces/abc/projects";
  const first = requestFingerprint("POST", path, { name: "Alpha" });
  const second = requestFingerprint("POST", path, { name: "Beta" });
  const repeat = requestFingerprint("POST", path, { name: "Alpha" });
  assert.equal(first, repeat);
  assert.notEqual(first, second);
});
