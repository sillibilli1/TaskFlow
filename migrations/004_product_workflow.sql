-- Phase 3 product workflow schema.
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) >= 1),
  description text NOT NULL DEFAULT '',
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id),
  UNIQUE (workspace_id, name)
);
CREATE INDEX IF NOT EXISTS projects_workspace_created_idx ON projects(workspace_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS projects_search_idx ON projects USING gin (lower(name) gin_trgm_ops);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  project_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(trim(title)) >= 1),
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  due_date date,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tasks_project_workspace_fk FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE CASCADE,
  UNIQUE (id, workspace_id)
);
CREATE INDEX IF NOT EXISTS tasks_workspace_project_idx ON tasks(workspace_id, project_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS tasks_workspace_status_idx ON tasks(workspace_id, status);
CREATE INDEX IF NOT EXISTS tasks_workspace_priority_idx ON tasks(workspace_id, priority);
CREATE INDEX IF NOT EXISTS tasks_workspace_due_date_idx ON tasks(workspace_id, due_date);
CREATE INDEX IF NOT EXISTS tasks_search_idx ON tasks USING gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));

CREATE TABLE IF NOT EXISTS labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) >= 1),
  color text NOT NULL DEFAULT '#64748b',
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name),
  UNIQUE (id, workspace_id)
);
CREATE TABLE IF NOT EXISTS task_labels (
  task_id uuid NOT NULL,
  label_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  PRIMARY KEY (task_id, label_id),
  FOREIGN KEY (task_id, workspace_id) REFERENCES tasks(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (label_id, workspace_id) REFERENCES labels(id, workspace_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS labels_workspace_idx ON labels(workspace_id, name);

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  task_id uuid NOT NULL,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body text NOT NULL CHECK (char_length(trim(body)) >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comments_task_workspace_fk FOREIGN KEY (task_id, workspace_id) REFERENCES tasks(id, workspace_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS comments_task_created_idx ON comments(task_id, created_at ASC, id ASC);

CREATE TABLE IF NOT EXISTS activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('project', 'task', 'comment')),
  entity_id uuid NOT NULL,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_events_workspace_created_idx ON activity_events(workspace_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS activity_events_entity_idx ON activity_events(entity_type, entity_id, created_at DESC);
