import { IsBoolean, IsNumber, IsObject, IsString } from "class-validator";

export class CreateBranchLogoProfileDto {
  @IsString()
  branchCode!: string;

  @IsNumber()
  profileVersion!: number;

  @IsString()
  profileName!: string;

  @IsObject()
  visibleWatermarkConfig!: Record<string, unknown>;

  @IsObject()
  hiddenWatermarkConfig!: Record<string, unknown>;

  @IsBoolean()
  isActive!: boolean;
}
