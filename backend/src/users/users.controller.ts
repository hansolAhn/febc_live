import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { ResetUserPasswordDto } from "./dto/reset-user-password.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(":userId")
  findOne(@Param("userId") userId: string) {
    return this.usersService.findOne(userId);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(":userId/block")
  block(@Param("userId") userId: string) {
    return this.usersService.updateStatus(userId, "block");
  }

  @Patch(":userId/restore")
  restore(@Param("userId") userId: string) {
    return this.usersService.updateStatus(userId, "restore");
  }

  @Patch(":userId")
  update(@Param("userId") userId: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch(":userId/reset-password")
  resetPassword(@Param("userId") userId: string, @Body() dto: ResetUserPasswordDto) {
    return this.usersService.resetPassword(userId, dto.password);
  }
}
