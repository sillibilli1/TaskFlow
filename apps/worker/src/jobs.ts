export const JOBS_QUEUE = "taskflow:jobs";

export type EmailJob = {
  type: "email";
  kind: string;
  email: string;
  token?: string;
  subject?: string;
  text?: string;
};

export function emailContent(job: EmailJob) {
  if (job.subject && job.text) return { subject: job.subject, text: job.text };
  const baseUrl = process.env.APP_URL ?? "http://localhost:5173";
  const path =
    job.kind === "verification"
      ? `/verify-email?token=${job.token}`
      : job.kind === "workspace-invite"
        ? `/invite?token=${job.token}`
        : `/reset-password?token=${job.token}`;
  const subject =
    job.kind === "verification"
      ? "Verify your Cloud SaaS email"
      : job.kind === "workspace-invite"
        ? "You have been invited to Cloud SaaS"
        : job.kind === "task_assigned"
          ? "You were assigned a task"
          : job.kind === "comment_created"
            ? "New comment on a task"
            : "Reset your Cloud SaaS password";
  return { subject, text: job.text ?? `${baseUrl}${path}` };
}
