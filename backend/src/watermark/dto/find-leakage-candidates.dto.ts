import { IsISO8601, IsOptional, IsString } from "class-validator";

export class FindLeakageCandidatesDto {
  @IsOptional()
  @IsString()
  sessionCodeFragment?: string;

  @IsOptional()
  @IsString()
  branchCode?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsISO8601()
  observedAtFrom?: string;

  @IsOptional()
  @IsISO8601()
  observedAtTo?: string;
}
