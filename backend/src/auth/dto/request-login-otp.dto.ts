import { IsString, MinLength } from "class-validator";

export class RequestLoginOtpDto {
  @IsString({ message: "아이디를 입력해 주세요." })
  @MinLength(1, { message: "아이디를 입력해 주세요." })
  username!: string;

  @IsString({ message: "비밀번호를 입력해 주세요." })
  @MinLength(4, { message: "비밀번호는 4자 이상 입력해 주세요." })
  password!: string;
}
