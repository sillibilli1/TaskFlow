import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
}
export class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}
export class RequestPasswordResetDto {
  @IsEmail() email!: string;
}
export class ResetPasswordDto {
  @IsString() @MinLength(8) password!: string;
}
export class TokenDto {
  @IsString()
  @MinLength(1)
  token!: string;
}
export class CreateWorkspaceDto {
  @IsString() @MinLength(2) name!: string;
}
export class InviteDto {
  @IsEmail() email!: string;
  @IsIn(["admin", "member", "viewer"]) role!: "admin" | "member" | "viewer";
}
export class CursorQueryDto {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() limit?: number;
}
