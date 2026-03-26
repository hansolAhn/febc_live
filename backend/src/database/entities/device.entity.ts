import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./base.entity";

@Entity({ name: "devices" })
export class Device extends AppBaseEntity {
  @Column({ name: "user_id" })
  userId!: string;

  @Column({ name: "branch_id" })
  branchId!: string;

  @Column({ name: "fingerprint_hash" })
  fingerprintHash!: string;

  @Column({ name: "device_label" })
  deviceLabel!: string;

  @Column({ nullable: true, name: "last_ip" })
  lastIp?: string;

  @Column({ default: false, name: "is_trusted" })
  isTrusted!: boolean;
}
