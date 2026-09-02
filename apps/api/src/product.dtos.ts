import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateProjectDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() description?: string;
}
export class UpdateProjectDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() description?: string;
}
export class CreateTaskDto {
  @IsString() @MinLength(1) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional()
  @IsIn(["todo", "in_progress", "done", "cancelled"])
  status?: string;
  @IsOptional() @IsIn(["low", "medium", "high", "urgent"]) priority?: string;
  @IsOptional() @IsUUID() assigneeId?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID("4", { each: true })
  labelIds?: string[];
}
export class UpdateTaskDto {
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional()
  @IsIn(["todo", "in_progress", "done", "cancelled"])
  status?: string;
  @IsOptional() @IsIn(["low", "medium", "high", "urgent"]) priority?: string;
  @IsOptional() @IsUUID() assigneeId?: string | null;
  @IsOptional() @IsDateString() dueDate?: string | null;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID("4", { each: true })
  labelIds?: string[];
}
export class CreateCommentDto {
  @IsString() @MinLength(1) body!: string;
}
export class TaskQueryDto {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() limit?: number;
  @IsOptional()
  @IsIn(["todo", "in_progress", "done", "cancelled"])
  status?: string;
  @IsOptional() @IsIn(["low", "medium", "high", "urgent"]) priority?: string;
  @IsOptional() @IsUUID() assigneeId?: string;
  @IsOptional() @IsDateString() dueBefore?: string;
  @IsOptional() @IsDateString() dueAfter?: string;
  @IsOptional() @IsUUID() labelId?: string;
  @IsOptional() @IsString() search?: string;
}
export class ActivityQueryDto {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() limit?: number;
}
export class CreateLabelDto {
  @IsString() @MinLength(1) @MaxLength(40) name!: string;
  @IsOptional() @IsString() @MaxLength(16) color?: string;
}
export class PresignAttachmentDto {
  @IsString() @MinLength(1) @MaxLength(255) filename!: string;
  @IsString() @MinLength(1) mimeType!: string;
  @IsInt() @IsPositive() @Max(10 * 1024 * 1024) size!: number;
}
export class CompleteAttachmentDto {
  @IsUUID() attachmentId!: string;
}
