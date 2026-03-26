import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./base.entity";
import { AuditActionType } from "src/common/enums";

@Entity({ name: "audit_logs" })
export class AuditLog extends AppBaseEntity {
  @Column({ nullable: true, name: "branch_id" })
  branchId?: string;

  @Column({ nullable: true, name: "user_id" })
  userId?: string;

  @Column({ type: "enum", enum: AuditActionType, name: "action_type" })
  actionType!: AuditActionType;

  @Column({ type: "jsonb", default: {} })
  payload!: Record<string, unknown>;

  @Column({ nullable: true, name: "actor_ip" })
  actorIp?: string;
}
