import { Controller, Get, Param } from "@nestjs/common";
import { BranchesService } from "./branches.service";

@Controller("branches")
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  findAll() {
    return this.branchesService.findAll();
  }

  @Get(":branchCode")
  findOne(@Param("branchCode") branchCode: string) {
    return this.branchesService.findOne(branchCode);
  }
}
