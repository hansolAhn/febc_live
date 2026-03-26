import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./base.entity";

@Entity({ name: "login_attempt_logs" })
export class LoginAttemptLog extends AppBaseEntity {
  @Column({ nullable: true, name: "branch_id" })
  branchId?: string;

  @Column({ nullable: true, name: "user_id" })
  userId?: string;

  @Column()
  username!: string;

  @Column({ nullable: true, name: "attempt_ip" })
  attemptIp?: string;

  @Column({ default: false })
  succeeded!: boolean;

  @Column({ nullable: true, name: "failure_reason" })
  failureReason?: string;
}
