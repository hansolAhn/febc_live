import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { AuditActionType } from "../common/enums";
import { InMemoryDataService } from "../database/in-memory-data.service";

@Injectable()
export class DevicesService {
  constructor(
    private readonly dataService: InMemoryDataService,
    private readonly auditLogsService: AuditLogsService
  ) {}

  findTrackedDevices() {
    return this.dataService.getDevices().map((device) => {
      const branch = this.dataService.getBranches().find((item) => item.id === device.branchId);
      const user = this.dataService.findUserById(device.userId);

      return {
        id: device.id,
        branchCode: branch?.code ?? "unknown",
        branchName: branch?.name ?? "알 수 없는 지사",
        username: user?.username ?? "-",
        deviceLabel: device.deviceLabel,
        fingerprintHash: device.fingerprintHash,
        isTrusted: device.isTrusted,
        isBlocked: device.isBlocked,
        lastIp: device.lastIp
      };
    });
  }

  updateApproval(deviceId: string, action: "approve" | "block") {
    const device = this.dataService.updateDeviceApproval(deviceId, action);
    if (!device) {
      throw new NotFoundException("Device not found");
    }

    this.auditLogsService.create({
      branchId: device.branchId,
      userId: device.userId,
      actionType: action === "approve" ? AuditActionType.DEVICE_APPROVED : AuditActionType.DEVICE_BLOCKED,
      payload: {
        deviceId: device.id,
        deviceLabel: device.deviceLabel,
        fingerprintHash: device.fingerprintHash,
        action
      }
    });

    return device;
  }
}
