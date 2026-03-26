import { IsString, IsNotEmpty, MinLength, MaxLength, Matches } from "class-validator";

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: "로그인을 입력해주세요" })
  @MaxLength(50, { message: "로그인은 50자 이하여야 합니다" })
  loginId!: string;

  @IsString()
  @IsNotEmpty({ message: "비밀번호를 입력해주세요" })
  @MinLength(8, { message: "비밀번호는 8자 이상이어야 합니다" })
  @MaxLength(100, { message: "비밀번호는 100자 이하여야 합니다" })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*]).+$/, {
    message: "비밀번호는 영문, 숫자, 특수문자를 각각 1자 이상 포함해야 합니다",
  })
  password!: string;
}