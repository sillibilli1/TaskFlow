-- Phase 2 session invalidation strengthening.
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;
