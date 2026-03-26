import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./base.entity";

@Entity({ name: "branch_allowed_ips" })
export class BranchAllowedIp extends AppBaseEntity {
  @Column({ name: "branch_id" })
  branchId!: string;

  @Column()
  cidr!: string;

  @Column({ nullable: true })
  description?: string;
}
