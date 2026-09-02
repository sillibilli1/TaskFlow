import { strict as assert } from "node:assert";
import { test } from "node:test";
import { emailContent } from "./jobs";

test("worker maps verification jobs to Mailtrap-friendly subjects", () => {
  const content = emailContent({
    type: "email",
    kind: "verification",
    email: "a@example.com",
    token: "abc",
  });
  assert.equal(content.subject, "Verify your Cloud SaaS email");
  assert.match(content.text, /token=abc/);
});

test("worker sends notification copy as provided", () => {
  const content = emailContent({
    type: "email",
    kind: "task_assigned",
    email: "a@example.com",
    subject: "You were assigned a task",
    text: "You were assigned Launch.",
  });
  assert.equal(content.subject, "You were assigned a task");
  assert.equal(content.text, "You were assigned Launch.");
});
