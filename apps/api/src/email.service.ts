import nodemailer from "nodemailer";

export async function sendLocalEmail(
  kind: string,
  email: string,
  token: string,
) {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
  });
  const baseUrl = process.env.APP_URL ?? "http://localhost:5173";
  const path =
    kind === "verification"
      ? `/verify-email?token=${token}`
      : kind === "workspace-invite"
        ? `/invite?token=${token}`
        : `/reset-password?token=${token}`;
  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM ?? "Cloud SaaS <no-reply@localhost>",
      to: email,
      subject:
        kind === "verification"
          ? "Verify your Cloud SaaS email"
          : kind === "workspace-invite"
            ? "You have been invited to Cloud SaaS"
            : "Reset your Cloud SaaS password",
      text: `${baseUrl}${path}`,
    });
  } catch (error) {
    console.warn(
      `[email:${kind}] delivery failed; local token is available in Mailpit configuration`,
      error instanceof Error ? error.message : error,
    );
  }
}
