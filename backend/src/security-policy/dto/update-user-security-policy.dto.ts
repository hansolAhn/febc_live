import { IsBoolean, IsOptional } from "class-validator";

export class UpdateUserSecurityPolicyDto {
  @IsOptional()
  @IsBoolean()
  singleSessionOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  otpRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  deviceRegistrationRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  forensicWatermarkEnabled?: boolean;
}
