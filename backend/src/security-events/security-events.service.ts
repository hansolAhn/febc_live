import { Injectable } from "@nestjs/common";
import { InMemoryDataService } from "../database/in-memory-data.service";
import { CreateSecurityEventDto } from "./dto/create-security-event.dto";

@Injectable()
export class SecurityEventsService {
  constructor(private readonly dataService: InMemoryDataService) {}

  findRecent() {
    return this.dataService.getSecurityEvents();
  }

  create(dto: CreateSecurityEventDto) {
    return this.dataService.addSecurityEvent({
      branchId: dto.branchId,
      userId: dto.userId,
      eventType: dto.eventType as never,
      severity: dto.severity,
      detail: dto.detail
    });
  }
}
