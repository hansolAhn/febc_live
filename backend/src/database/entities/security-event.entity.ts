import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./base.entity";
import { SecurityEventType } from "src/common/enums";

@Entity({ name: "security_events" })
export class SecurityEvent extends AppBaseEntity {
  @Column({ nullable: true, name: "branch_id" })
  branchId?: string;

  @Column({ nullable: true, name: "user_id" })
  userId?: string;

  @Column({ type: "enum", enum: SecurityEventType, name: "event_type" })
  eventType!: SecurityEventType;

  @Column()
  severity!: string;

  @Column({ type: "jsonb", default: {} })
  detail!: Record<string, unknown>;

  @Column({ default: false, name: "is_resolved" })
  isResolved!: boolean;
}
