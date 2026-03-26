import { IsObject, IsOptional, IsString } from "class-validator";

export class CreateSecurityEventDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  eventType!: string;

  @IsString()
  severity!: string;

  @IsObject()
  detail!: Record<string, unknown>;
}
