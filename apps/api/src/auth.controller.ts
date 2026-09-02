import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
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
  TokenDto,
} from "./dtos";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Post("register") @HttpCode(201) async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password);
  }
  @Post("login") @HttpCode(200) async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.validateCredentials(dto.email, dto.password);
    const refresh = await this.auth.issueRefresh(user.id);
    res.cookie(
      "access_token",
      this.auth.signAccess(user, user.sessionVersion),
      {
        ...tokenCookie,
        maxAge: 15 * 60 * 1000,
      },
    );
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
    res.cookie(
      "access_token",
      this.auth.signAccess(result.user, result.user.sessionVersion),
      {
        ...tokenCookie,
        maxAge: 15 * 60 * 1000,
      },
    );
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
  @Get("verify-email")
  verify(@Query() query: TokenDto) {
    return this.auth.verifyEmail(query.token);
  }
  @Post("password-reset/request")
  request(@Body() dto: RequestPasswordResetDto) {
    return this.auth.requestPasswordReset(dto.email);
  }
  @Post("password-reset/confirm") reset(
    @Body() dto: ResetPasswordDto,
    @Query() query: TokenDto,
  ) {
    return this.auth.resetPassword(query.token, dto.password);
  }
  @Get("me") @UseGuards(AuthGuard) me(@Req() req: AuthRequest) {
    return req.user;
  }
}
