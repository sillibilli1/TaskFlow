-- Phase 4 production features: attachments, notifications, and broader audit entities.
ALTER TABLE activity_events DROP CONSTRAINT IF EXISTS activity_events_entity_type_check;
ALTER TABLE activity_events ADD CONSTRAINT activity_events_entity_type_check
  CHECK (entity_type IN ('project', 'task', 'comment', 'attachment', 'label', 'member'));

CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  task_id uuid NOT NULL,
  filename text NOT NULL CHECK (char_length(trim(filename)) >= 1),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  mime_type text NOT NULL,
  storage_key text NOT NULL UNIQUE,
  uploaded_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attachments_task_workspace_fk
    FOREIGN KEY (task_id, workspace_id) REFERENCES tasks(id, workspace_id) ON DELETE CASCADE,
  UNIQUE (id, workspace_id)
);
CREATE INDEX IF NOT EXISTS attachments_task_idx
  ON attachments(workspace_id, task_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_workspace_user_idx
  ON notifications(workspace_id, user_id, created_at DESC);
