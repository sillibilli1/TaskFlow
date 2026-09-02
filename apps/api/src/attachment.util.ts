export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "application/pdf": ["pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    "docx",
  ],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "text/csv": ["csv"],
  "text/plain": ["txt"],
};

export function sanitizeFilename(filename: string) {
  const trimmed = filename.trim().split(/[/\\]/).pop() ?? "file";
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "file";
}

export function validateAttachment(
  filename: string,
  mimeType: string,
  size: number,
) {
  if (!Number.isFinite(size) || size <= 0) return "File size is invalid";
  if (size > MAX_ATTACHMENT_BYTES) return "File exceeds the 10MB limit";
  const allowed = ALLOWED_MIME_TYPES[mimeType];
  if (!allowed) return "File type is not allowed";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (!allowed.includes(ext))
    return "File extension does not match the MIME type";
  if (filename.includes("..") || /[\\/]/.test(filename))
    return "Filename is invalid";
  return null;
}
