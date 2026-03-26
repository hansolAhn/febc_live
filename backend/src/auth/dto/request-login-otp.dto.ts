import { IsString, MinLength } from "class-validator";

export class RequestLoginOtpDto {
  @IsString()
  branchCode!: string;

  @IsString()
  username!: string;

  @IsString()
  @MinLength(4)
  password!: string;
}
