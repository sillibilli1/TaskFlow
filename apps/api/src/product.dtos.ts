import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
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
