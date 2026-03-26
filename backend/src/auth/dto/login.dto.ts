import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsString()
  branchCode!: string;

  @IsString()
  username!: string;

  @IsString()
  @MinLength(4)
  password!: string;

  @IsOptional()
  @IsString()
  otpCode?: string;

  @IsString()
  deviceFingerprint!: string;

  @IsString()
  deviceLabel!: string;

  @IsOptional()
  @IsBoolean()
  forceLogin?: boolean;
}
