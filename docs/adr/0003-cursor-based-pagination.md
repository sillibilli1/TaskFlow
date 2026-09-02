# ADR 0003: Cursor-Based Pagination over Offset/Limit for Large Datasets and Activity Feeds

- **Status**: Accepted
- **Date**: 2026-08-30
- **Deciders**: Engineering Lead / Architect

---

## Context

TaskFlow task lists, activity event streams, and audit logs continuously ingest new records from active team collaborators. We required a pagination strategy that supports:

1. High consistency under concurrent writes without missing or duplicating records between pages.
2. Constant-time query performance (`O(1)`) as datasets grow to millions of rows.
3. Intuitive "Load More" and infinite-scroll capabilities in the web frontend.

---

## Decision

We chose **Keyset / Cursor-Based Pagination** using an opaque composite cursor encoding `(created_at, id)`.

### Implementation:

1. When querying a list (e.g. `GET /api/v1/workspaces/:wId/projects/:pId/tasks?limit=20&cursor=...`), the API constructs the following SQL:
   ```sql
   SELECT * FROM tasks
   WHERE project_id = $1
     AND (created_at, id) < ($2, $3)
   ORDER BY created_at DESC, id DESC
   LIMIT $4;
   ```
2. The response returns the matching items along with a `next_cursor` (base64-encoded `created_at` timestamp + UUID of the last row).
3. Database indexes are explicitly declared on `(project_id, created_at DESC, id DESC)` and `(workspace_id, created_at DESC, id DESC)`.

---

## Alternatives Considered

### Traditional Offset / Limit (`OFFSET 1000 LIMIT 20`)

- **Pros**: Simple to implement; supports arbitrary page hopping (e.g. "Jump to page 47").
- **Cons**:
  - **Performance Degradation**: PostgreSQL must scan and discard all preceding rows (`OFFSET N` requires scanning `N` rows), causing latency to degrade linearly (`O(N)`) on deep pages.
  - **Page Drift & Duplication**: If a new task or activity event is inserted while a user is browsing page 1, fetching page 2 with `OFFSET 20` shifts the window, causing the user to see the 20th item twice. Conversely, if an item is deleted, an item is silently skipped.

---

## Consequences

- **Positive**:
  - **Deterministic Performance**: Database queries consistently utilize B-tree index seek operations in `O(log N)` time regardless of whether fetching page 1 or page 10,000.
  - **Zero Duplicate or Skipped Items**: New items inserted at the top of the feed never alter the cursor position of older items.
  - Native fit for modern single-page apps with infinite scrolling or "Load More" pagination.
- **Negative**:
  - Cannot jump directly to an arbitrary page number (e.g. Page 15) without traversing sequentially.
  - Requires composite database indexes on `(tenant_id, created_at, id)` to prevent index scans from reverting to sequential scans.
