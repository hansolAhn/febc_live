import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RequestLoginOtpDto } from "./dto/request-login-otp.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, request);
  }

  @Post("request-otp")
  requestOtp(@Body() dto: RequestLoginOtpDto, @Req() request: Request) {
    return this.authService.requestLoginOtp(dto, request);
  }

  @Get("me")
  me(@Req() request: Request) {
    return this.authService.getCurrentUser(request);
  }

  @Post("logout")
  logout(@Req() request: Request) {
    return this.authService.logout(request);
  }
}
