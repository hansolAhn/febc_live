import { Controller, Get, Param, Patch } from "@nestjs/common";
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

  @Patch(":userId/block")
  block(@Param("userId") userId: string) {
    return this.usersService.updateStatus(userId, "block");
  }

  @Patch(":userId/restore")
  restore(@Param("userId") userId: string) {
    return this.usersService.updateStatus(userId, "restore");
  }
}
