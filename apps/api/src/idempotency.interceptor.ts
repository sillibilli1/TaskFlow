import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { of } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { MUTATION_METHODS } from "./rate-limit.interceptor";
import { AuthRequest } from "./guards";
import { RedisService } from "./redis.service";

const TTL_SECONDS = 24 * 60 * 60;

export function requestFingerprint(
  method: string,
  path: string,
  body: unknown,
) {
  return createHash("sha256")
    .update(method)
    .update(":")
    .update(path)
    .update(":")
    .update(JSON.stringify(body ?? null))
    .digest("hex");
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const header = req.headers["idempotency-key"];
    const key = Array.isArray(header) ? header[0] : header;
    if (!key || !MUTATION_METHODS.has(req.method)) return next.handle();
    if (key.length < 8 || key.length > 256)
      throw new BadRequestException("Invalid Idempotency-Key header");

    const identity = req.user?.id ?? req.ip ?? "anonymous";
    const fingerprint = requestFingerprint(req.method, req.path, req.body);
    const redisKey = `idem:${identity}:${key}`;
    const res = context.switchToHttp().getResponse();

    try {
      const client = this.redis.client;
      if (client.status === "wait") await client.connect();
      const existing = await client.get(redisKey);
      if (existing) {
        const parsed = JSON.parse(existing) as {
          status: string;
          requestHash: string;
          statusCode?: number;
          body?: unknown;
        };
        if (parsed.requestHash !== fingerprint)
          throw new ConflictException(
            "Idempotency-Key was reused with a different request",
          );
        if (parsed.status === "processing")
          throw new ConflictException(
            "A request with this Idempotency-Key is already in progress",
          );
        res.status(parsed.statusCode ?? 200);
        return of(parsed.body);
      }
      await client.set(
        redisKey,
        JSON.stringify({ status: "processing", requestHash: fingerprint }),
        "EX",
        60,
      );
      return next.handle().pipe(
        tap((body) => {
          const statusCode =
            res.statusCode || (req.method === "POST" ? 201 : 200);
          void client.set(
            redisKey,
            JSON.stringify({
              status: "complete",
              requestHash: fingerprint,
              statusCode,
              body,
            }),
            "EX",
            TTL_SECONDS,
          );
        }),
        catchError((error) => {
          void client.del(redisKey);
          throw error;
        }),
      );
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      )
        throw error;
      console.warn(
        "[idempotency] redis unavailable; failing open",
        error instanceof Error ? error.message : error,
      );
      return next.handle();
    }
  }
}
