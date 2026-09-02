import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Module,
} from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { DatabaseService } from "./db.service";
import { RedisService } from "./redis.service";
import { RoleGuard } from "./guards";
import { WorkspaceController } from "./workspace.controller";
import { WorkspaceService } from "./workspace.service";
import { ProductController } from "./product.controller";
import { ProductService } from "./product.service";
import { QueueService } from "./queue.service";
import { StorageService } from "./storage.service";
import { RateLimitInterceptor } from "./rate-limit.interceptor";
import { IdempotencyInterceptor } from "./idempotency.interceptor";

@Controller()
class AppController {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}
  @Get("health") health() {
    return { status: "ok" };
  }
  @Get("ready") async ready() {
    try {
      await this.db.query("SELECT 1");
      await this.redis.ping();
      return { status: "ready", dependencies: { postgres: "up", redis: "up" } };
    } catch (error) {
      console.error(
        "Readiness check failed",
        error instanceof Error ? error.message : error,
      );
      throw new HttpException(
        {
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Required dependencies are unavailable",
            details: [],
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
@Module({
  controllers: [
    AppController,
    AuthController,
    WorkspaceController,
    ProductController,
  ],
  providers: [
    DatabaseService,
    RedisService,
    QueueService,
    StorageService,
    AuthService,
    WorkspaceService,
    ProductService,
    RoleGuard,
    { provide: APP_INTERCEPTOR, useClass: RateLimitInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
  exports: [AuthService, DatabaseService, RedisService, QueueService],
})
export class AppModule {}
