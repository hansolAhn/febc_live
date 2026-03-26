import { IsObject, IsOptional, IsString } from "class-validator";

export class CreateAuditLogDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  actionType!: string;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  actorIp?: string;
}
