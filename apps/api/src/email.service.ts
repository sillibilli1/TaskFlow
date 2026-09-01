import nodemailer from "nodemailer";

export async function sendLocalEmail(
  kind: string,
  email: string,
  token: string,
) {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "sandbox.smtp.mailtrap.io",
    port: Number(process.env.SMTP_PORT ?? 2525),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    secure: process.env.SMTP_SECURE === "true",
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
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
      `[email:${kind}] delivery failed; check Mailtrap credentials and sandbox inbox`,
      error instanceof Error ? error.message : error,
    );
  }
}
