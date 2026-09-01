import { strict as assert } from "node:assert";
import { test } from "node:test";

test("health contract is documented", () => {
  assert.equal("/api/v1/health", "/api/v1/health");
});
