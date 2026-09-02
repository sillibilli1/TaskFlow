import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { AuthRequest } from "./guards";
import { RedisService } from "./redis.service";

export const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    if (!MUTATION_METHODS.has(req.method)) return next.handle();
    const windowSec = Number(process.env.RATE_LIMIT_WINDOW_SEC ?? 60);
    const limit = Number(process.env.RATE_LIMIT_MUTATION ?? 60);
    const identity = req.user?.id ?? req.ip ?? "anonymous";
    const key = `rl:mut:${identity}`;
    try {
      const client = this.redis.client;
      if (client.status === "wait") await client.connect();
      const count = await client.incr(key);
      if (count === 1) await client.expire(key, windowSec);
      if (count > limit)
        throw new HttpException(
          "Too many requests. Please retry shortly.",
          HttpStatus.TOO_MANY_REQUESTS,
        );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.warn(
        "[rate-limit] redis unavailable; failing open",
        error instanceof Error ? error.message : error,
      );
    }
    return next.handle();
  }
}
