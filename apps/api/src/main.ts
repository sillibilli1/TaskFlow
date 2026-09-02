import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { resolve } from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: resolve(process.cwd(), "../../.env") });
import cookieParser from "cookie-parser";
import { ApiExceptionFilter } from "./common/api-exception.filter";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = (
    process.env.CORS_ORIGINS?.split(",") ?? ["http://localhost:5173"]
  ).map((o) => o.trim().replace(/\/+$/, ""));

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, "");
      const isAllowed =
        allowedOrigins.includes(cleanOrigin) ||
        cleanOrigin.endsWith(".onrender.com") ||
        cleanOrigin.includes("localhost") ||
        cleanOrigin.includes("127.0.0.1");
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
  });

  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get("/", (_req: any, res: any) => {
    res.json({
      name: "TaskFlow API",
      status: "online",
      version: "1.0",
      docs: "/api/v1/docs",
      health: "/api/v1/health",
      ready: "/api/v1/ready",
    });
  });

  app.setGlobalPrefix("api/v1");
  app.use(cookieParser());
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const config = new DocumentBuilder()
    .setTitle("Cloud SaaS API")
    .setVersion("1.0")
    .build();
  SwaggerModule.setup(
    "api/v1/docs",
    app,
    SwaggerModule.createDocument(app, config),
  );
  await app.listen(Number(process.env.PORT ?? 3000), "0.0.0.0");
}
bootstrap();
