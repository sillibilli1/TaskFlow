import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    if (!(exception instanceof HttpException))
      console.error("Unhandled API exception", exception);
    const raw =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const message =
      typeof raw === "object" && raw !== null && "message" in raw
        ? raw.message
        : "Internal server error";
    response.status(status).json({
      error: {
        code:
          status >= 500
            ? "INTERNAL_ERROR"
            : (HttpStatus[status] ?? "HTTP_ERROR"),
        message: Array.isArray(message)
          ? "Request validation failed"
          : String(message),
        details: Array.isArray(message) ? message : [],
      },
      path: request.url,
    });
  }
}
