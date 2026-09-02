import { Inject, Injectable } from "@nestjs/common";
import { sendLocalEmail, sendMail } from "./email.service";
import { RedisService } from "./redis.service";

export const JOBS_QUEUE = "taskflow:jobs";

export type EmailJob = {
  type: "email";
  kind: string;
  email: string;
  token?: string;
  subject?: string;
  text?: string;
};

@Injectable()
export class QueueService {
  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  async enqueue(job: Record<string, unknown>) {
    const client = this.redis.client;
    if (client.status === "wait") await client.connect();
    await client.lpush(JOBS_QUEUE, JSON.stringify(job));
  }

  async enqueueEmail(job: Omit<EmailJob, "type">) {
    try {
      await this.enqueue({ type: "email", ...job });
    } catch (error) {
      console.warn(
        "[queue] enqueue failed; sending email inline",
        error instanceof Error ? error.message : error,
      );
      if (job.subject && job.text)
        await sendMail(job.email, job.subject, job.text);
      else if (job.token) await sendLocalEmail(job.kind, job.email, job.token);
    }
  }
}
