# ADR 0005: Supabase Storage over Cloudflare R2 for Task Attachments

- **Status**: Accepted
- **Date**: 2026-09-02
- **Deciders**: Engineering Lead / Architect

---

## Context

TaskFlow supports task file attachments (images, documents, PDFs up to 10MB). In a cloud-native architecture, file payloads must never pass through or be buffered in the core API container memory to prevent denial-of-service, memory leaks, and CPU starvation.

Instead, attachments must use **pre-signed URLs** allowing the client browser to upload and download files directly to/from S3-compatible object storage.

Two object storage providers were evaluated:

1. **Supabase Storage** (already provisioned alongside PostgreSQL).
2. **Cloudflare R2** (S3-compatible, zero egress fees).

---

## Decision

We chose **Supabase Storage** (private `attachments` bucket) for managing task attachments.

### Implementation:

1. **Pre-signed Uploads**:
   - Client calls `POST /api/v1/workspaces/:wId/tasks/:tId/attachments/presign`.
   - The API validates file size (`<= 10MB`) and MIME type (whitelist: png, jpg, webp, pdf, docx, xlsx, csv, txt).
   - Generates a scoped pre-signed upload URL using the Supabase Storage SDK (`createSignedUploadUrl`).
2. **Direct Browser Upload**:
   - The React client performs a standard HTTP `PUT` directly to Supabase Storage with the file bytes.
3. **Commit Metadata**:
   - Client calls `POST .../attachments/complete` to write filename, MIME type, size, and storage key into the PostgreSQL `attachments` table.
4. **Pre-signed Downloads**:
   - When a user views or downloads an attachment, the API verifies workspace membership and calls `createSignedUrl` with a 60-second expiration.

---

## Alternatives Considered

### Cloudflare R2

- **Pros**: Zero egress bandwidth fees; high global performance via Cloudflare Anycast edge.
- **Cons**:
  - Requires creating, authenticating, and managing an additional separate third-party vendor account (Cloudflare).
  - Requires setting up S3 SDK credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `ENDPOINT`) and manual bucket provisioning outside the existing Supabase dashboard.
  - For a free-tier portfolio project, Supabase Storage provides 1GB of free storage with zero extra vendor configuration.

---

## Consequences

- **Positive**:
  - **Unified Credential Boundary**: Uses the existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` already configured for PostgreSQL, eliminating extra secrets.
  - **Zero Direct Server Load**: API instances never buffer multipart file bytes into Node.js process memory.
  - **Secure Private Storage**: Public bucket access is disabled; all file downloads require authenticated pre-signed URLs.
- **Negative**:
  - Supabase free-tier limits storage to 1GB and monthly bandwidth to 2GB (more than sufficient for demonstration and testing, but requires upgrading to Pro or migrating to AWS S3/Cloudflare R2 at enterprise scale).
