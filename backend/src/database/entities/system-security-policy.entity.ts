import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./base.entity";

@Entity({ name: "system_security_policy" })
export class SystemSecurityPolicy extends AppBaseEntity {
  @Column({ default: true, name: "single_session_only" })
  singleSessionOnly!: boolean;

  @Column({ default: false, name: "otp_required" })
  otpRequired!: boolean;

  @Column({ default: true, name: "device_registration_required" })
  deviceRegistrationRequired!: boolean;

  @Column({ default: true, name: "forensic_watermark_enabled" })
  forensicWatermarkEnabled!: boolean;

  @Column({ default: 5, name: "login_attempt_threshold" })
  loginAttemptThreshold!: number;
}
