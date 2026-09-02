import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  MAX_ATTACHMENT_BYTES,
  sanitizeFilename,
  validateAttachment,
} from "./attachment.util";

test("accepts allowed document and image types under 10MB", () => {
  assert.equal(validateAttachment("notes.txt", "text/plain", 12), null);
  assert.equal(validateAttachment("photo.jpg", "image/jpeg", 1024), null);
  assert.equal(validateAttachment("photo.png", "image/png", 2048), null);
  assert.equal(validateAttachment("photo.webp", "image/webp", 2048), null);
  assert.equal(validateAttachment("spec.pdf", "application/pdf", 4096), null);
  assert.equal(
    validateAttachment(
      "brief.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      4096,
    ),
    null,
  );
  assert.equal(
    validateAttachment(
      "sheet.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      4096,
    ),
    null,
  );
  assert.equal(validateAttachment("rows.csv", "text/csv", 100), null);
});

test("rejects oversized, disallowed, and mismatched files", () => {
  assert.equal(
    validateAttachment("notes.txt", "text/plain", MAX_ATTACHMENT_BYTES + 1),
    "File exceeds the 10MB limit",
  );
  assert.equal(
    validateAttachment("payload.exe", "application/x-msdownload", 12),
    "File type is not allowed",
  );
  assert.equal(
    validateAttachment("notes.txt", "application/pdf", 12),
    "File extension does not match the MIME type",
  );
  assert.equal(
    validateAttachment("../secret.txt", "text/plain", 12),
    "Filename is invalid",
  );
});

test("sanitizes storage filenames", () => {
  assert.equal(sanitizeFilename("My File (1).txt"), "My_File__1_.txt");
  assert.equal(sanitizeFilename("..\\windows\\path.pdf"), "path.pdf");
});
