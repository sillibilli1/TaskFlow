import { resolve } from "node:path";
import { createServer } from "node:http";
import dotenv from "dotenv";
import Redis from "ioredis";
import nodemailer from "nodemailer";
import { emailContent, EmailJob, JOBS_QUEUE } from "./jobs";

dotenv.config({ path: resolve(process.cwd(), "../../.env") });

async function sendMail(email: string, subject: string, text: string) {
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
  await transport.sendMail({
    from: process.env.EMAIL_FROM ?? "Cloud SaaS <no-reply@localhost>",
    to: email,
    subject,
    text,
  });
}

export async function handleJob(raw: string, redis?: Redis) {
  const job = JSON.parse(raw) as EmailJob;
  if (job.type !== "email") return;
  const content = emailContent(job);

  if (redis) {
    try {
      const record = {
        id: crypto.randomUUID(),
        to_email: job.email,
        to: job.email,
        subject: content.subject,
        text: content.text,
        created_at: new Date().toISOString(),
      };
      await redis.lpush("taskflow:sent_emails", JSON.stringify(record));
      await redis.ltrim("taskflow:sent_emails", 0, 99);
    } catch (err) {
      console.warn("[worker] redis record failed:", err);
    }
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await sendMail(job.email, content.subject, content.text);
      return;
    } catch (err: any) {
      lastError = err;
      const isQuotaLimit =
        String(err?.message ?? "").includes("535") ||
        String(err?.message ?? "").includes("limit is reached");
      console.warn(
        `[worker] sendMail attempt ${attempt} failed:`,
        err instanceof Error ? err.message : err,
      );
      if (isQuotaLimit) {
        console.warn(
          `[worker] Mailtrap quota limit reached; email captured in Redis inbox for ${job.email}`,
        );
        return;
      }
      if (attempt < 2) await new Promise((res) => setTimeout(res, 2000 * attempt));
    }
  }
}

async function processJobs(redis: Redis) {
  while (true) {
    try {
      const result = await redis.brpop(JOBS_QUEUE, 5);
      if (!result) continue;
      await handleJob(result[1], redis);
      await new Promise((resolveWait) => setTimeout(resolveWait, 500));
    } catch (error) {
      console.warn(
        "[worker] job failed",
        error instanceof Error ? error.message : error,
      );
      await new Promise((resolveWait) => setTimeout(resolveWait, 2000));
    }
  }
}

if (process.env.WORKER_DISABLE_LISTEN !== "true") {
  const port = Number(process.env.WORKER_PORT ?? 3001);
  createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("worker online\n");
  }).listen(port, "0.0.0.0");
  const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 1,
  });
  void processJobs(redis);
  console.log(`Worker health server listening on ${port}`);
}
