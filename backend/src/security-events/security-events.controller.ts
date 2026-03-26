import { Body, Controller, Get, Post } from "@nestjs/common";
import { CreateSecurityEventDto } from "./dto/create-security-event.dto";
import { SecurityEventsService } from "./security-events.service";

@Controller("security-events")
export class SecurityEventsController {
  constructor(private readonly securityEventsService: SecurityEventsService) {}

  @Get()
  findRecent() {
    return this.securityEventsService.findRecent();
  }

  @Post()
  create(@Body() dto: CreateSecurityEventDto) {
    return this.securityEventsService.create(dto);
  }
}
