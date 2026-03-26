import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./base.entity";

@Entity({ name: "user_allowed_ips" })
export class UserAllowedIp extends AppBaseEntity {
  @Column({ name: "user_id" })
  userId!: string;

  @Column()
  cidr!: string;

  @Column({ nullable: true })
  description?: string;
}
