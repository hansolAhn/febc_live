import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./base.entity";

@Entity({ name: "user_security_policy" })
export class UserSecurityPolicy extends AppBaseEntity {
  @Column({ unique: true, name: "user_id" })
  userId!: string;

  @Column({ default: false, name: "otp_required" })
  otpRequired!: boolean;

  @Column({ default: false, name: "device_registration_required" })
  deviceRegistrationRequired!: boolean;
}
