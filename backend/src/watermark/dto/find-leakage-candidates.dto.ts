import { IsOptional, IsString } from "class-validator";

export class FindLeakageCandidatesDto {
  @IsOptional()
  @IsString()
  sessionCodeFragment?: string;

  @IsOptional()
  @IsString()
  branchCode?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  auditActionType?: string;
}
