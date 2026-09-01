import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Module,
} from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { DatabaseService } from "./db.service";
import { RedisService } from "./redis.service";
import { RoleGuard } from "./guards";
import { WorkspaceController } from "./workspace.controller";
import { WorkspaceService } from "./workspace.service";

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
  controllers: [AppController, AuthController, WorkspaceController],
  providers: [
    DatabaseService,
    RedisService,
    AuthService,
    WorkspaceService,
    RoleGuard,
  ],
  exports: [AuthService, DatabaseService, RedisService],
})
export class AppModule {}
