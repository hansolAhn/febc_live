import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./base.entity";

@Entity({ name: "branch_security_policy" })
export class BranchSecurityPolicy extends AppBaseEntity {
  @Column({ unique: true, name: "branch_id" })
  branchId!: string;

  @Column({ default: true, name: "single_session_only" })
  singleSessionOnly!: boolean;

  @Column({ default: false, name: "otp_required" })
  otpRequired!: boolean;

  @Column({ default: true, name: "device_registration_required" })
  deviceRegistrationRequired!: boolean;

  @Column({ default: true, name: "forensic_watermark_enabled" })
  forensicWatermarkEnabled!: boolean;
}
