import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RoleGuard } from "./guards";
import { WorkspaceController } from "./workspace.controller";
import { WorkspaceService } from "./workspace.service";
import { DatabaseService } from "./db.service";
import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";

@Controller()
class AppController {
  @Get("health") health() {
    return { status: "ok" };
  }
  @Get("ready") async ready() {
    const client = await new DatabaseService().pool.connect().catch(() => null);
    if (!client)
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
    client.release();
    return { status: "ready", dependencies: { postgres: "up" } };
  }
}
@Module({
  controllers: [AppController, AuthController, WorkspaceController],
  providers: [DatabaseService, AuthService, WorkspaceService, RoleGuard],
  exports: [AuthService, DatabaseService],
})
export class AppModule {}
