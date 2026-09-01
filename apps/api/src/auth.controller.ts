import {
  Body,
  Controller,
  Post,
  Get,
  Query,
  Res,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { AuthService, tokenCookie } from "./auth.service";
import { AuthGuard, AuthRequest } from "./guards";
import {
  LoginDto,
  RegisterDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
} from "./dtos";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post("register") async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password);
  }
  @Post("login") async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.validateCredentials(dto.email, dto.password);
    const refresh = await this.auth.issueRefresh(user.id);
    res.cookie("access_token", this.auth.signAccess(user), {
      ...tokenCookie,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refresh_token", refresh.raw, {
      ...tokenCookie,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { user };
  }
  @Post("refresh") async refresh(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const value = req.cookies?.refresh_token;
    const result = await this.auth.rotateRefresh(value ?? "");
    res.cookie("access_token", this.auth.signAccess(result.user), {
      ...tokenCookie,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refresh_token", result.raw, {
      ...tokenCookie,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { user: result.user };
  }
  @Post("logout") async logout(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(req.cookies?.refresh_token);
    res.clearCookie("access_token", tokenCookie);
    res.clearCookie("refresh_token", tokenCookie);
    return { loggedOut: true };
  }
  @Get("verify-email") verify(@Query("token") token: string) {
    return this.auth.verifyEmail(token);
  }
  @Post("password-reset/request")
  request(@Body() dto: RequestPasswordResetDto) {
    return this.auth.requestPasswordReset(dto.email);
  }
  @Post("password-reset/confirm") reset(
    @Body() dto: ResetPasswordDto,
    @Query("token") token: string,
  ) {
    return this.auth.resetPassword(token, dto.password);
  }
  @Get("me") @UseGuards(AuthGuard) me(@Req() req: AuthRequest) {
    return req.user;
  }
}
