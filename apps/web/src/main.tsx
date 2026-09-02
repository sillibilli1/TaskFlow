import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

// ==========================================
// Types
// ==========================================
type User = { id: string; email: string };
type Workspace = { id: string; name: string; role: string };
type Project = {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
  created_at?: string;
};
type Label = { id: string; name: string; color: string };
type Member = { id: string; email: string; role: string };
type Attachment = {
  id: string;
  filename: string;
  size_bytes: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
};
type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  read_at?: string | null;
  created_at: string;
};
type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  due_date?: string | null;
  dueDate?: string | null;
  assignee_id?: string | null;
  projectId?: string;
  project_id?: string;
  created_at?: string;
  labels?: Label[];
};
type Comment = {
  id: string;
  body: string;
  author_id?: string;
  authorId?: string;
  created_at?: string;
  createdAt?: string;
};
type ActivityEvent = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor_id: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};

// ==========================================
// Premium TaskFlow Logo Component
// ==========================================
function TaskFlowLogo({
  size = 36,
  showText = true,
  theme = "light",
}: {
  size?: number;
  showText?: boolean;
  theme?: "light" | "dark";
}) {
  return (
    <div className="taskflow-brand-container">
      <div
        className="brand-mark-box"
        style={{
          width: size,
          height: size,
          minWidth: size,
          borderRadius: Math.round(size * 0.28),
        }}
      >
        <svg
          width={Math.round(size * 0.65)}
          height={Math.round(size * 0.65)}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Bold Check & Flow Vector in deep forest teal */}
          <path
            d="M3.5 13L8.5 18L20.5 6"
            stroke="#102b2c"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Dynamic Coral Accent Node */}
          <circle cx="19" cy="17" r="2.5" fill="#f47c55" />
        </svg>
      </div>
      {showText && (
        <span className={`taskflow-brand-text ${theme}`}>
          Task<span className="brand-highlight">Flow</span>
        </span>
      )}
    </div>
  );
}

// ==========================================
// Professional SVG Icons
// ==========================================
function IconPlus({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon ${className}`}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconUsers({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon ${className}`}
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconFolder({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon ${className}`}
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconCalendar({
  size = 14,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon ${className}`}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconCheckSquare({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon ${className}`}
    >
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function IconClock({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon ${className}`}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconCheckCircle({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon ${className}`}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function IconLock({
  size = 14,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon ${className}`}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconTrash({
  size = 15,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon ${className}`}
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function IconSearch({
  size = 15,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon ${className}`}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconMenu({
  size = 20,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon ${className}`}
    >
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconClose({
  size = 18,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon ${className}`}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconActivity({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon ${className}`}
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconSend({
  size = 15,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon ${className}`}
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconLogOut({
  size = 15,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon ${className}`}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconPaperclip({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon ${className}`}
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function IconBell({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon ${className}`}
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconLayers({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon ${className}`}
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

// ==========================================
const API_BASE =
  (
    import.meta as unknown as { env?: { VITE_API_URL?: string } }
  ).env?.VITE_API_URL?.replace(/\/+$/, "") ?? "";
const API = `${API_BASE}/api/v1`;

function newIdempotencyKey() {
  return crypto.randomUUID();
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string> | undefined) ?? {}),
  };
  if (
    ["POST", "PATCH", "PUT", "DELETE"].includes(method) &&
    !headers["Idempotency-Key"]
  ) {
    headers["Idempotency-Key"] = newIdempotencyKey();
  }
  const response = await fetch(`${API}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const body = isJson ? await response.json().catch(() => ({})) : {};
  if (!response.ok) {
    throw new Error(
      body?.error?.message ??
        (typeof body?.message === "string"
          ? body.message
          : `Request failed (${response.status})`),
    );
  }
  return body as T;
}

// ==========================================
// Auth Component
// ==========================================
function Auth({
  onLogin,
  initialMessage = "",
}: {
  onLogin: (user: User) => void;
  initialMessage?: string;
}) {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(initialMessage);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      if (register) {
        await api<{ message: string }>("/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setInfo(
          "Verification email sent to Mailtrap Sandbox. Please click the link in your inbox and sign in.",
        );
        setRegister(false);
      } else {
        const result = await api<{ user: User }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        onLogin(result.user);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to authenticate");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-logo-row">
          <TaskFlowLogo size={42} showText={true} theme="dark" />
        </div>
        <h1>{register ? "Build momentum together." : "Welcome back."}</h1>
        <p className="muted">
          {register
            ? "Sign up for TaskFlow to coordinate software projects, tasks, and team discussions."
            : "A focused workspace for projects, tasks, and the conversations behind them."}
        </p>
        {info && <div className="info-banner">{info}</div>}
        {error && <div className="alert">{error}</div>}
        <form onSubmit={submit}>
          <label>
            Email
            <input
              required
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              required
              minLength={8}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button disabled={busy} className="primary wide">
            {busy ? "Working…" : register ? "Create account" : "Sign in"}
          </button>
        </form>
        <button
          className="link-button"
          onClick={() => {
            setRegister(!register);
            setError("");
            setInfo("");
          }}
        >
          {register
            ? "Already have an account? Sign in"
            : "Create a new account"}
        </button>
      </section>
    </main>
  );
}

// ==========================================
// Main Application Component
// ==========================================
export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [inbox, setInbox] = useState<NotificationItem[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modals state
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState("todo");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskLabelIds, setNewTaskLabelIds] = useState<string[]>([]);
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState("");
  const [newLabelName, setNewLabelName] = useState("");
  const [uploading, setUploading] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "member" | "admin">(
    "viewer",
  );

  // Role permissions
  const canWrite = useMemo(() => {
    return workspace?.role
      ? ["owner", "admin", "member"].includes(workspace.role)
      : false;
  }, [workspace]);

  const isOwnerOrAdmin = useMemo(() => {
    return workspace?.role
      ? ["owner", "admin"].includes(workspace.role)
      : false;
  }, [workspace]);

  // Handle URL tokens
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const pathname = window.location.pathname;

    if (
      token &&
      (pathname.includes("verify") ||
        window.location.search.includes("verify") ||
        !pathname.includes("invite"))
    ) {
      api<{ verified: boolean }>(
        `/auth/verify-email?token=${encodeURIComponent(token)}`,
      )
        .then(() => {
          setNotification(
            "Your email has been verified successfully. You can now sign in.",
          );
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
        })
        .catch((e) => {
          setError(e.message || "Email verification failed or token expired.");
        });
    }

    if (token && pathname.includes("invite")) {
      api<{ workspaceId: string }>(`/workspaces/invitations/accept`, {
        method: "POST",
        body: JSON.stringify({ token }),
      })
        .then(() => {
          setNotification("Workspace invitation accepted.");
          window.history.replaceState({}, document.title, "/");
          refreshWorkspaces();
        })
        .catch((e) => {
          setError(e.message || "Failed to accept workspace invitation.");
        });
    }
  }, []);

  // Check current session
  useEffect(() => {
    api<User>("/auth/me")
      .then((u) => {
        if (u && u.id) setUser(u);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch workspaces
  function refreshWorkspaces() {
    if (!user) return;
    api<{ items: Workspace[] }>("/workspaces")
      .then((r) => {
        const items = r?.items ?? [];
        setWorkspaces(items);
        setWorkspace((prev) => {
          if (prev) {
            const found = items.find((w) => w.id === prev.id);
            return found ?? items[0] ?? null;
          }
          return items[0] ?? null;
        });
      })
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    if (user) refreshWorkspaces();
  }, [user]);

  // Fetch projects
  function refreshProjects() {
    if (!workspace) {
      setProjects([]);
      setProject(null);
      return;
    }
    api<{ items: Project[] }>(`/workspaces/${workspace.id}/projects`)
      .then((r) => {
        const items = r?.items ?? [];
        setProjects(items);
        setProject((prev) => {
          if (prev) {
            const found = items.find((p) => p.id === prev.id);
            return found ?? items[0] ?? null;
          }
          return items[0] ?? null;
        });
      })
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    refreshProjects();
    refreshActivity();
    refreshLabels();
    refreshMembers();
    refreshInbox();
  }, [workspace]);

  // Fetch tasks
  function refreshTasks() {
    if (!project || !workspace) {
      setTasks([]);
      return;
    }
    api<{ items: Task[] }>(
      `/workspaces/${workspace.id}/projects/${project.id}/tasks?limit=100`,
    )
      .then((r) => setTasks(r?.items ?? []))
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    refreshTasks();
  }, [project, workspace]);

  // Fetch comments
  function refreshComments() {
    if (!selectedTask || !workspace) {
      setComments([]);
      return;
    }
    api<{ items: Comment[] }>(
      `/workspaces/${workspace.id}/tasks/${selectedTask.id}/comments`,
    )
      .then((r) => setComments(r?.items ?? []))
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    refreshComments();
    refreshAttachments();
  }, [selectedTask, workspace]);

  function refreshActivity() {
    if (!workspace) return;
    api<{ items: ActivityEvent[] }>(
      `/workspaces/${workspace.id}/audit-events?limit=50`,
    )
      .then((r) => setActivities(r?.items ?? []))
      .catch(() => {});
  }

  function refreshLabels() {
    if (!workspace) {
      setLabels([]);
      return;
    }
    api<{ items: Label[] }>(`/workspaces/${workspace.id}/labels`)
      .then((r) => setLabels(r?.items ?? []))
      .catch(() => {});
  }

  function refreshMembers() {
    if (!workspace) {
      setMembers([]);
      return;
    }
    api<{ items: Member[] }>(`/workspaces/${workspace.id}/members`)
      .then((r) => setMembers(r?.items ?? []))
      .catch(() => {});
  }

  function refreshInbox() {
    if (!workspace) {
      setInbox([]);
      return;
    }
    api<{ items: NotificationItem[] }>(
      `/workspaces/${workspace.id}/notifications?limit=20`,
    )
      .then((r) => setInbox(r?.items ?? []))
      .catch(() => {});
  }

  function refreshAttachments() {
    if (!selectedTask || !workspace) {
      setAttachments([]);
      return;
    }
    api<{ items: Attachment[] }>(
      `/workspaces/${workspace.id}/tasks/${selectedTask.id}/attachments`,
    )
      .then((r) => setAttachments(r?.items ?? []))
      .catch(() => {});
  }

  // Filter tasks
  const visibleTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesFilter = filter === "all" ? true : t.status === filter;
      const matchesSearch =
        !searchQuery.trim() ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description &&
          t.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [tasks, filter, searchQuery]);

  // Action: Create Workspace
  async function handleCreateWorkspace(e: FormEvent) {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    try {
      const created = await api<Workspace>("/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      });
      setWorkspaces([...workspaces, created]);
      setWorkspace(created);
      setNewWorkspaceName("");
      setShowNewWorkspaceModal(false);
      setNotification(`Workspace "${created.name}" created.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create workspace");
    }
  }

  // Action: Create Project
  async function handleCreateProject(e: FormEvent) {
    e.preventDefault();
    if (!workspace || !newProjectName.trim()) return;
    try {
      const created = await api<Project>(
        `/workspaces/${workspace.id}/projects`,
        {
          method: "POST",
          body: JSON.stringify({
            name: newProjectName.trim(),
            description: newProjectDescription.trim() || undefined,
          }),
        },
      );
      setProjects([created, ...projects]);
      setProject(created);
      setNewProjectName("");
      setNewProjectDescription("");
      setShowNewProjectModal(false);
      setNotification(`Project "${created.name}" created.`);
      refreshActivity();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create project");
    }
  }

  // Action: Delete Project
  async function deleteProject(projectId: string) {
    if (
      !workspace ||
      !confirm(
        "Are you sure you want to delete this project and all its tasks?",
      )
    )
      return;
    try {
      await api(`/workspaces/${workspace.id}/projects/${projectId}`, {
        method: "DELETE",
      });
      const remaining = projects.filter((p) => p.id !== projectId);
      setProjects(remaining);
      if (project?.id === projectId) {
        setProject(remaining[0] ?? null);
      }
      setNotification("Project deleted successfully.");
      refreshActivity();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete project");
    }
  }

  async function handleCreateTask(e: FormEvent) {
    e.preventDefault();
    if (!workspace || !project || !newTaskTitle.trim()) return;
    try {
      const created = await api<Task>(
        `/workspaces/${workspace.id}/projects/${project.id}/tasks`,
        {
          method: "POST",
          body: JSON.stringify({
            title: newTaskTitle.trim(),
            description: newTaskDescription.trim() || undefined,
            status: newTaskStatus,
            priority: newTaskPriority,
            dueDate: newTaskDueDate || undefined,
            labelIds: newTaskLabelIds,
            assigneeId: newTaskAssigneeId || undefined,
          }),
        },
      );
      setTasks([created, ...tasks]);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskStatus("todo");
      setNewTaskPriority("medium");
      setNewTaskDueDate("");
      setNewTaskLabelIds([]);
      setNewTaskAssigneeId("");
      setShowNewTaskModal(false);
      setNotification(`Task created successfully.`);
      refreshActivity();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create task");
    }
  }

  async function handleCreateLabel(e: FormEvent) {
    e.preventDefault();
    if (!workspace || !newLabelName.trim()) return;
    try {
      const created = await api<Label>(`/workspaces/${workspace.id}/labels`, {
        method: "POST",
        body: JSON.stringify({ name: newLabelName.trim() }),
      });
      setLabels(
        [...labels, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setNewLabelName("");
      setNotification(`Label "${created.name}" created.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create label");
    }
  }

  async function handleUploadAttachment(file: File) {
    if (!workspace || !selectedTask) return;
    setUploading(true);
    try {
      const presign = await api<{
        attachmentId: string;
        signedUrl: string;
        token: string;
        path: string;
      }>(
        `/workspaces/${workspace.id}/tasks/${selectedTask.id}/attachments/presign`,
        {
          method: "POST",
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type || "text/plain",
            size: file.size,
          }),
        },
      );
      const upload = await fetch(presign.signedUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${presign.token}`,
          "Content-Type": file.type || "text/plain",
          "x-upsert": "false",
        },
        body: file,
      });
      if (!upload.ok) throw new Error("Storage upload failed");
      await api(
        `/workspaces/${workspace.id}/tasks/${selectedTask.id}/attachments/complete`,
        {
          method: "POST",
          body: JSON.stringify({ attachmentId: presign.attachmentId }),
        },
      );
      setNotification(`Uploaded ${file.name}.`);
      refreshAttachments();
      refreshActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload file");
    } finally {
      setUploading(false);
    }
  }

  async function openAttachment(attachment: Attachment) {
    if (!workspace || !selectedTask) return;
    try {
      const result = await api<{ signedUrl: string }>(
        `/workspaces/${workspace.id}/tasks/${selectedTask.id}/attachments/${attachment.id}/download`,
      );
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download file");
    }
  }

  async function markInboxRead(item: NotificationItem) {
    if (!workspace || item.read_at) return;
    try {
      await api(`/workspaces/${workspace.id}/notifications/${item.id}/read`, {
        method: "POST",
      });
      setInbox(
        inbox.map((entry) =>
          entry.id === item.id
            ? { ...entry, read_at: new Date().toISOString() }
            : entry,
        ),
      );
    } catch {
      /* non-blocking */
    }
  }

  // Action: Update Task Status
  async function updateStatus(task: Task, status: string) {
    if (!workspace) return;
    try {
      const updated = await api<Task>(
        `/workspaces/${workspace.id}/tasks/${task.id}`,
        { method: "PATCH", body: JSON.stringify({ status }) },
      );
      setTasks(
        tasks.map((t) =>
          t.id === task.id ? { ...t, status: updated.status } : t,
        ),
      );
      if (selectedTask?.id === task.id) {
        setSelectedTask((prev) =>
          prev ? { ...prev, status: updated.status } : null,
        );
      }
      refreshActivity();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update task status");
    }
  }

  // Delete Task
  async function deleteTask(taskId: string) {
    if (!workspace || !confirm("Confirm deletion of this task?")) return;
    try {
      await api(`/workspaces/${workspace.id}/tasks/${taskId}`, {
        method: "DELETE",
      });
      setTasks(tasks.filter((t) => t.id !== taskId));
      if (selectedTask?.id === taskId) setSelectedTask(null);
      setNotification("Task deleted.");
      refreshActivity();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete task");
    }
  }

  // Action: Add Comment
  async function addComment(event: FormEvent) {
    event.preventDefault();
    if (!selectedTask || !workspace || !commentText.trim()) return;
    try {
      const created = await api<Comment>(
        `/workspaces/${workspace.id}/tasks/${selectedTask.id}/comments`,
        { method: "POST", body: JSON.stringify({ body: commentText.trim() }) },
      );
      setComments([...comments, created]);
      setCommentText("");
      refreshActivity();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add comment");
    }
  }

  // Action: Invite Member
  async function handleInviteMember(e: FormEvent) {
    e.preventDefault();
    if (!workspace || !inviteEmail.trim()) return;
    try {
      const result = await api<{ email: string; role: string }>(
        `/workspaces/${workspace.id}/invitations`,
        {
          method: "POST",
          body: JSON.stringify({
            email: inviteEmail.trim().toLowerCase(),
            role: inviteRole,
          }),
        },
      );
      setShowInviteModal(false);
      setInviteEmail("");
      setNotification(
        `Invitation sent to ${result.email} with role "${result.role}". Check Mailtrap Sandbox for the invite link.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to send invitation");
    }
  }

  // Action: Logout
  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
    setWorkspaces([]);
    setWorkspace(null);
    setProjects([]);
    setProject(null);
    setTasks([]);
  }

  if (loading) {
    return (
      <main className="loading-screen">
        <TaskFlowLogo size={48} showText={true} theme="light" />
        <p>Loading your workspace…</p>
      </main>
    );
  }

  if (!user) {
    return <Auth onLogin={setUser} initialMessage={notification} />;
  }

  return (
    <div className="app">
      {/* Mobile Top Header */}
      <div className="mobile-bar">
        <button
          className="menu-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation menu"
        >
          <IconMenu size={22} />
        </button>
        <div className="mobile-brand">
          <TaskFlowLogo size={28} showText={true} theme="light" />
        </div>
        <span className="user-badge">{user.email.split("@")[0]}</span>
      </div>

      {/* Backdrop overlay for closing mobile sidebar */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar backdrop"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={sidebarOpen ? "open" : ""}>
        <div className="sidebar-header-row">
          <div className="logo">
            <TaskFlowLogo size={36} showText={true} theme="light" />
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <IconClose size={20} />
          </button>
        </div>

        <div className="sidebar-section">
          <div className="side-label-row">
            <span className="side-label">Workspaces</span>
            <button
              className="icon-btn-ghost"
              title="Create new workspace"
              onClick={() => setShowNewWorkspaceModal(true)}
            >
              <IconPlus size={14} />
            </button>
          </div>

          <div className="workspace-list">
            {workspaces.map((w) => (
              <button
                className={`workspace-option ${workspace?.id === w.id ? "active" : ""}`}
                key={w.id}
                onClick={() => {
                  setWorkspace(w);
                  setSidebarOpen(false);
                }}
              >
                <span className="workspace-dot" />
                <span className="workspace-name">{w.name}</span>
                <span className={`role-badge ${w.role}`}>{w.role}</span>
              </button>
            ))}
          </div>

          <button
            className="ghost-button"
            onClick={() => setShowNewWorkspaceModal(true)}
          >
            <IconPlus size={14} /> New workspace
          </button>
        </div>

        {workspace && isOwnerOrAdmin && (
          <div className="sidebar-section">
            <button
              className="invite-trigger-btn"
              onClick={() => setShowInviteModal(true)}
            >
              <IconUsers size={15} /> Invite team member
            </button>
          </div>
        )}

        <div className="sidebar-bottom">
          <div className="user-info">
            <div className="user-avatar">{user.email[0].toUpperCase()}</div>
            <div className="user-meta">
              <span className="user-email" title={user.email}>
                {user.email}
              </span>
              <span className="user-sub">
                Role:{" "}
                {workspace?.role ? workspace.role.toUpperCase() : "MEMBER"}
              </span>
            </div>
          </div>
          <button className="ghost-button signout-btn" onClick={logout}>
            <IconLogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="content">
        <header>
          <div>
            <div className="workspace-tag">
              <span className="eyebrow">
                {workspace?.name ?? "Your workspace"}
              </span>
              {workspace && (
                <span className={`role-pill ${workspace.role}`}>
                  {workspace.role === "viewer"
                    ? "Viewer (Read-Only)"
                    : workspace.role.toUpperCase()}
                </span>
              )}
            </div>
            <h2>Good morning, {user.email.split("@")[0]}</h2>
          </div>

          <div className="header-actions">
            {workspace && (
              <button
                className="secondary-btn"
                onClick={() => setShowAuditLog(true)}
              >
                <IconActivity size={16} /> Audit log
              </button>
            )}
            {isOwnerOrAdmin && (
              <button
                className="secondary-btn"
                onClick={() => setShowInviteModal(true)}
              >
                <IconUsers size={16} /> Invite Member
              </button>
            )}
            {canWrite && (
              <button
                className="primary"
                onClick={() => setShowNewProjectModal(true)}
              >
                <IconPlus size={16} /> New Project
              </button>
            )}
          </div>
        </header>

        {/* Notifications & Alerts */}
        {notification && (
          <div className="info-banner">
            <span>{notification}</span>
            <button className="close-alert" onClick={() => setNotification("")}>
              <IconClose size={15} />
            </button>
          </div>
        )}

        {error && (
          <div className="alert">
            <span>{error}</span>
            <button className="close-alert" onClick={() => setError("")}>
              <IconClose size={15} />
            </button>
          </div>
        )}

        {!workspace ? (
          <Empty
            icon={<IconLayers size={32} />}
            title="Create your first workspace"
            text="Workspaces keep your projects and conversations organized."
            action={() => setShowNewWorkspaceModal(true)}
            actionText="Create workspace"
          />
        ) : (
          <>
            {/* Top Metrics Cards */}
            <section className="metrics">
              <Metric
                icon={<IconClock size={20} />}
                value={tasks.filter((t) => t.status !== "done").length}
                label="Open tasks"
                color="orange"
              />
              <Metric
                icon={<IconCalendar size={20} />}
                value={tasks.filter((t) => t.dueDate || t.due_date).length}
                label="With deadlines"
                color="blue"
              />
              <Metric
                icon={<IconCheckCircle size={20} />}
                value={tasks.filter((t) => t.status === "done").length}
                label="Completed"
                color="green"
              />
              <Metric
                icon={<IconFolder size={20} />}
                value={projects.length}
                label="Active projects"
                color="teal"
              />
            </section>

            {/* Project Navigation Bar */}
            <section className="projects-bar">
              <div className="projects-tabs">
                <span className="projects-label">Projects</span>
                {projects.length === 0 ? (
                  <span className="muted-small">No projects created yet</span>
                ) : (
                  projects.map((p) => (
                    <button
                      key={p.id}
                      className={`project-tab ${project?.id === p.id ? "active" : ""}`}
                      onClick={() => setProject(p)}
                    >
                      <IconFolder size={14} /> {p.name}
                    </button>
                  ))
                )}
              </div>
              {canWrite && (
                <button
                  className="tab-add-btn"
                  onClick={() => setShowNewProjectModal(true)}
                  title="Create new project"
                >
                  <IconPlus size={13} /> Add Project
                </button>
              )}
            </section>

            {/* Workspace Main Panels */}
            <div className="workspace-grid">
              {/* Task Management Panel */}
              <section className="panel task-panel">
                <div className="panel-head">
                  <div className="panel-title-area">
                    <p className="eyebrow">Current Project</p>
                    <div className="project-title-row">
                      <h3>{project?.name ?? "No project selected"}</h3>
                      {project?.description && (
                        <p className="project-desc">{project.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="panel-actions">
                    {canWrite && project && (
                      <div className="project-action-buttons">
                        <button
                          className="danger-btn-outline"
                          title="Delete current project"
                          onClick={() => deleteProject(project.id)}
                        >
                          <IconTrash size={14} /> Delete Project
                        </button>
                        <button
                          className="primary task-create-btn"
                          onClick={() => setShowNewTaskModal(true)}
                        >
                          <IconPlus size={15} /> New task
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {!project ? (
                  <Empty
                    icon={<IconFolder size={32} />}
                    title="Create your first project"
                    text="Projects give your team a clear place to get work done."
                    action={
                      canWrite ? () => setShowNewProjectModal(true) : undefined
                    }
                    actionText={canWrite ? "Create project" : undefined}
                  />
                ) : (
                  <>
                    {/* Control Bar: Filters & Search */}
                    <div className="tasks-control-bar">
                      <div className="filters">
                        {[
                          { key: "all", label: "All tasks" },
                          { key: "todo", label: "To do" },
                          { key: "in_progress", label: "In Progress" },
                          { key: "done", label: "Done" },
                        ].map((s) => (
                          <button
                            className={filter === s.key ? "selected" : ""}
                            key={s.key}
                            onClick={() => setFilter(s.key)}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>

                      <div className="search-box">
                        <IconSearch size={14} className="search-icon" />
                        <input
                          type="text"
                          placeholder="Filter tasks…"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Task List */}
                    <div className="task-list">
                      {visibleTasks.length ? (
                        visibleTasks.map((task) => {
                          const dueDateVal = task.dueDate || task.due_date;
                          return (
                            <div
                              className="task-row"
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                            >
                              <span className={`status-dot ${task.status}`} />
                              <div className="task-title">
                                <strong>{task.title}</strong>
                                {task.description && (
                                  <p className="task-subtext">
                                    {task.description}
                                  </p>
                                )}
                                <div className="task-meta-line">
                                  {dueDateVal && (
                                    <span className="due-badge">
                                      <IconCalendar size={12} />{" "}
                                      {dueDateVal.split("T")[0]}
                                    </span>
                                  )}
                                  <span className={`priority ${task.priority}`}>
                                    {task.priority}
                                  </span>
                                  {(task.labels ?? []).map((label) => (
                                    <span className="label-chip" key={label.id}>
                                      {label.name}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div
                                className="task-status-control"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {canWrite ? (
                                  <select
                                    value={task.status}
                                    onChange={(e) =>
                                      updateStatus(task, e.target.value)
                                    }
                                  >
                                    <option value="todo">To do</option>
                                    <option value="in_progress">
                                      In progress
                                    </option>
                                    <option value="done">Done</option>
                                    <option value="cancelled">Cancelled</option>
                                  </select>
                                ) : (
                                  <span
                                    className={`status-pill ${task.status}`}
                                  >
                                    {task.status.replace("_", " ")}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="empty-tasks-placeholder">
                          <IconCheckSquare
                            size={28}
                            className="empty-icon-svg"
                          />
                          <h4>No tasks here</h4>
                          <p>
                            {searchQuery || filter !== "all"
                              ? "No tasks match your current filter or search criteria."
                              : "Your focused work will appear in this list."}
                          </p>
                          {canWrite && !searchQuery && filter === "all" && (
                            <button
                              className="primary"
                              onClick={() => setShowNewTaskModal(true)}
                            >
                              <IconPlus size={15} /> Create your first task
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </section>

              {/* Activity Timeline Panel */}
              <section className="panel activity">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Team pulse</p>
                    <h3>Inbox & activity</h3>
                  </div>
                  <span className="live-dot">
                    <IconActivity size={12} /> Live
                  </span>
                </div>
                {inbox.length > 0 && (
                  <div className="inbox-list">
                    {inbox.slice(0, 5).map((item) => (
                      <button
                        className={`inbox-item ${item.read_at ? "read" : ""}`}
                        key={item.id}
                        onClick={() => markInboxRead(item)}
                      >
                        <IconBell size={14} />
                        <span>
                          <strong>{item.title}</strong>
                          <small>{item.body}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="activity-container">
                  {activities.length ? (
                    <div className="activity-timeline">
                      {activities.map((act) => (
                        <div className="activity-item" key={act.id}>
                          <div className="activity-bullet" />
                          <div className="activity-body">
                            <p className="activity-text">
                              <strong>
                                {act.actor_id === user.id ? "You" : "Teammate"}
                              </strong>{" "}
                              {act.action === "created" &&
                                `created a ${act.entity_type}`}
                              {act.action === "status_changed" &&
                                `updated task status`}
                              {act.action === "updated" &&
                                `updated a ${act.entity_type}`}
                              {act.action === "deleted" &&
                                `deleted a ${act.entity_type}`}
                            </p>
                            <span className="activity-time">
                              {new Date(act.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="activity-empty">
                      <IconActivity size={24} className="activity-icon-svg" />
                      <p>
                        Activity will appear as your team creates tasks, changes
                        status, and comments.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </main>

      {/* Modal: New Workspace */}
      {showNewWorkspaceModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowNewWorkspaceModal(false)}
        >
          <section className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowNewWorkspaceModal(false)}
            >
              <IconClose size={18} />
            </button>
            <p className="eyebrow">New Workspace</p>
            <h2>Create a workspace</h2>
            <form onSubmit={handleCreateWorkspace}>
              <label>
                Workspace Name
                <input
                  required
                  autoFocus
                  placeholder="e.g. Engineering, Acme Corp"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                />
              </label>
              <div className="modal-buttons">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setShowNewWorkspaceModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Create Workspace
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: New Project */}
      {showNewProjectModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowNewProjectModal(false)}
        >
          <section className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowNewProjectModal(false)}
            >
              <IconClose size={18} />
            </button>
            <p className="eyebrow">Workspace: {workspace?.name}</p>
            <h2>Create a new project</h2>
            <form onSubmit={handleCreateProject}>
              <label>
                Project Name
                <input
                  required
                  autoFocus
                  placeholder="e.g. Mobile App Redesign, API v2"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </label>
              <label>
                Description (optional)
                <input
                  placeholder="Brief description of the project goal…"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                />
              </label>
              <div className="modal-buttons">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setShowNewProjectModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Create Project
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: New Task */}
      {showNewTaskModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowNewTaskModal(false)}
        >
          <section className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowNewTaskModal(false)}
            >
              <IconClose size={18} />
            </button>
            <p className="eyebrow">Project: {project?.name}</p>
            <h2>Add a new task</h2>
            <form onSubmit={handleCreateTask}>
              <label>
                Task Title *
                <input
                  required
                  autoFocus
                  placeholder="e.g. Implement user authentication"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
              </label>

              <label>
                Description
                <textarea
                  className="custom-textarea"
                  rows={3}
                  placeholder="Additional context, acceptance criteria, or links…"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                />
              </label>

              <div className="form-grid">
                <label>
                  Initial Status
                  <select
                    value={newTaskStatus}
                    onChange={(e) => setNewTaskStatus(e.target.value)}
                  >
                    <option value="todo">To do</option>
                    <option value="in_progress">In progress</option>
                    <option value="done">Done</option>
                  </select>
                </label>

                <label>
                  Priority
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </label>

                <label>
                  Due Date
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                  />
                </label>
              </div>

              <label>
                Assignee
                <select
                  value={newTaskAssigneeId}
                  onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.email}
                    </option>
                  ))}
                </select>
              </label>

              <div className="label-picker">
                <span>Labels</span>
                {labels.length ? (
                  <div className="label-options">
                    {labels.map((label) => (
                      <label className="chip-option" key={label.id}>
                        <input
                          type="checkbox"
                          checked={newTaskLabelIds.includes(label.id)}
                          onChange={() =>
                            setNewTaskLabelIds((current) =>
                              current.includes(label.id)
                                ? current.filter((id) => id !== label.id)
                                : [...current, label.id],
                            )
                          }
                        />
                        {label.name}
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="muted-small">
                    No labels yet. Create one below.
                  </p>
                )}
                {canWrite && (
                  <div className="inline-create">
                    <input
                      placeholder="New label name"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                    />
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={handleCreateLabel}
                    >
                      Add label
                    </button>
                  </div>
                )}
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setShowNewTaskModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Create Task
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Invite Team Member */}
      {showInviteModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowInviteModal(false)}
        >
          <section className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowInviteModal(false)}
            >
              <IconClose size={18} />
            </button>
            <p className="eyebrow">Workspace: {workspace?.name}</p>
            <h2>Invite team member</h2>
            <p className="muted">
              Send an email invitation link to join this workspace.
            </p>
            <form onSubmit={handleInviteMember}>
              <label>
                Email address
                <input
                  required
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </label>

              <label>
                Role
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(
                      e.target.value as "viewer" | "member" | "admin",
                    )
                  }
                >
                  <option value="viewer">Viewer (Read-only access)</option>
                  <option value="member">
                    Member (Can create & edit tasks)
                  </option>
                  <option value="admin">Admin (Full workspace control)</option>
                </select>
              </label>

              <div className="role-explainer">
                {inviteRole === "viewer" && (
                  <span>
                    <strong>Viewer</strong> can view projects, tasks, comments,
                    and activity, but cannot create or edit items.
                  </span>
                )}
                {inviteRole === "member" && (
                  <span>
                    <strong>Member</strong> can create and manage tasks, update
                    status, and post comments.
                  </span>
                )}
                {inviteRole === "admin" && (
                  <span>
                    <strong>Admin</strong> has full management permissions
                    including inviting other members.
                  </span>
                )}
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Send Invitation
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Task Detail & Comments */}
      {selectedTask && (
        <div className="modal-backdrop" onClick={() => setSelectedTask(null)}>
          <section className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setSelectedTask(null)}
            >
              <IconClose size={18} />
            </button>
            <p className="eyebrow">Task details</p>
            <h2>{selectedTask.title}</h2>

            <div className="detail-meta">
              <span className={`priority ${selectedTask.priority}`}>
                {selectedTask.priority}
              </span>
              <span className={`status-pill ${selectedTask.status}`}>
                {selectedTask.status.replace("_", " ")}
              </span>
              {(selectedTask.dueDate || selectedTask.due_date) && (
                <span className="due-meta">
                  <IconCalendar size={13} /> Due{" "}
                  {
                    (selectedTask.dueDate || selectedTask.due_date)?.split(
                      "T",
                    )[0]
                  }
                </span>
              )}
            </div>

            <div className="detail-description">
              <p>{selectedTask.description || "No description provided."}</p>
            </div>

            {canWrite && (
              <div className="task-actions-row">
                <label className="inline-label">
                  Status:
                  <select
                    value={selectedTask.status}
                    onChange={(e) => updateStatus(selectedTask, e.target.value)}
                  >
                    <option value="todo">To do</option>
                    <option value="in_progress">In progress</option>
                    <option value="done">Done</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>

                <button
                  className="danger-btn"
                  onClick={() => deleteTask(selectedTask.id)}
                >
                  <IconTrash size={14} /> Delete task
                </button>
              </div>
            )}

            {(selectedTask.labels ?? []).length > 0 && (
              <div className="label-row">
                {selectedTask.labels!.map((label) => (
                  <span className="label-chip" key={label.id}>
                    {label.name}
                  </span>
                ))}
              </div>
            )}

            <div className="attachments-section">
              <h3>
                <IconPaperclip size={15} /> Attachments ({attachments.length})
              </h3>
              {attachments.length ? (
                <div className="attachment-list">
                  {attachments.map((file) => (
                    <button
                      className="attachment-row"
                      key={file.id}
                      onClick={() => openAttachment(file)}
                    >
                      <strong>{file.filename}</strong>
                      <small>
                        {Math.max(1, Math.round(file.size_bytes / 1024))} KB
                      </small>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted-small">No files attached yet.</p>
              )}
              {canWrite && (
                <label className="upload-control">
                  {uploading ? "Uploading…" : "Upload file"}
                  <input
                    type="file"
                    hidden
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUploadAttachment(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>

            {/* Comments Section */}
            <div className="comments-section">
              <h3>Comments ({comments.length})</h3>
              <div className="comments">
                {comments.length ? (
                  comments.map((c) => {
                    const isSelf = (c.authorId || c.author_id) === user.id;
                    return (
                      <div className="comment" key={c.id}>
                        <div className="comment-head">
                          <strong>{isSelf ? "You" : "Teammate"}</strong>
                          <small>
                            {c.createdAt || c.created_at
                              ? new Date(
                                  (c.createdAt || c.created_at)!,
                                ).toLocaleString([], {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </small>
                        </div>
                        <p className="comment-body">{c.body}</p>
                      </div>
                    );
                  })
                ) : (
                  <p className="muted-small">
                    No comments yet. Start the conversation!
                  </p>
                )}
              </div>

              {canWrite ? (
                <form className="comment-form" onSubmit={addComment}>
                  <input
                    placeholder="Add a comment…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <button className="primary" disabled={!commentText.trim()}>
                    <IconSend size={14} /> Send
                  </button>
                </form>
              ) : (
                <div className="read-only-notice">
                  <IconLock size={14} /> You are viewing this workspace as a{" "}
                  <strong>Viewer</strong>. Write actions and commenting are
                  disabled.
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Modal: Workspace Audit Log */}
      {showAuditLog && (
        <div className="modal-backdrop" onClick={() => setShowAuditLog(false)}>
          <section
            className="modal wide-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowAuditLog(false)}
            >
              <IconClose size={18} />
            </button>
            <p className="eyebrow">Workspace: {workspace?.name}</p>
            <h2>Audit log</h2>
            <p className="muted">
              Immutable workspace history from activity events, including
              projects, tasks, comments, and attachments.
            </p>
            <div className="audit-table">
              {activities.length ? (
                activities.map((act) => (
                  <div className="audit-row" key={act.id}>
                    <strong>
                      {act.actor_id === user.id ? "You" : "Teammate"}{" "}
                      {act.action} {act.entity_type}
                    </strong>
                    <span>{new Date(act.created_at).toLocaleString()}</span>
                    <small>{act.entity_id}</small>
                  </div>
                ))
              ) : (
                <p className="muted-small">No audit events yet.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// ==========================================
// Helper UI Components
// ==========================================
function Metric({
  icon,
  value,
  label,
  color = "teal",
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color?: string;
}) {
  return (
    <div className={`metric color-${color}`}>
      <div className="metric-header">
        <span className="metric-icon">{icon}</span>
        <strong>{value}</strong>
      </div>
      <span>{label}</span>
      <i />
    </div>
  );
}

function Empty({
  icon,
  title,
  text,
  action,
  actionText,
}: {
  icon?: React.ReactNode;
  title: string;
  text: string;
  action?: () => void;
  actionText?: string;
}) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon-wrap">{icon}</div>}
      <h3>{title}</h3>
      <p>{text}</p>
      {action && actionText && (
        <button className="primary" onClick={action}>
          <IconPlus size={15} /> {actionText}
        </button>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
