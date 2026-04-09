import { Controller, Get, Param, Patch } from "@nestjs/common";
import { DevicesService } from "./devices.service";

@Controller("devices")
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  findAll() {
    return this.devicesService.findTrackedDevices();
  }

  @Patch(":deviceId/approve")
  approve(@Param("deviceId") deviceId: string) {
    return this.devicesService.updateApproval(deviceId, "approve");
  }

  @Patch(":deviceId/block")
  block(@Param("deviceId") deviceId: string) {
    return this.devicesService.updateApproval(deviceId, "block");
  }

  @Patch(":deviceId/restore")
  restore(@Param("deviceId") deviceId: string) {
    return this.devicesService.restoreApproval(deviceId);
  }
}
