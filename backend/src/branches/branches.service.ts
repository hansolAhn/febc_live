import { Injectable, NotFoundException } from "@nestjs/common";
import { InMemoryDataService } from "../database/in-memory-data.service";

@Injectable()
export class BranchesService {
  constructor(private readonly dataService: InMemoryDataService) {}

  findAll() {
    return this.dataService.getBranches();
  }

  findOne(branchCode: string) {
    const branch = this.dataService.findBranchByCode(branchCode);
    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    return {
      ...branch,
      users: this.dataService.getUsers().filter((user) => user.branchId === branch.id)
    };
  }
}
