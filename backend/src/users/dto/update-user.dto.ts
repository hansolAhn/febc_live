import { IsIn, IsOptional, IsString } from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsIn(["SUPER_ADMIN", "VIEWER"])
  roleCode?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
