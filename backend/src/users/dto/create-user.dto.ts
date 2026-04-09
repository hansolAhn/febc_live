import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class CreateUserDto {
  @IsString({ message: "소속을 입력해 주세요." })
  @MinLength(1, { message: "소속을 입력해 주세요." })
  branchCode!: string;

  @IsString({ message: "아이디를 입력해 주세요." })
  @MinLength(1, { message: "아이디를 입력해 주세요." })
  username!: string;

  @IsString()
  @IsIn(["VIEWER"])
  roleCode!: string;

  @IsString({ message: "초기 비밀번호를 입력해 주세요." })
  @MinLength(4, { message: "비밀번호는 4자 이상 입력해 주세요." })
  password!: string;

  @IsString({ message: "연락처를 입력해 주세요." })
  @MinLength(1, { message: "연락처를 입력해 주세요." })
  phone!: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
