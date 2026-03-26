import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./base.entity";
import { SessionStatus } from "src/common/enums";

@Entity({ name: "user_sessions" })
export class UserSession extends AppBaseEntity {
  @Column({ name: "user_id" })
  userId!: string;

  @Column({ name: "branch_id" })
  branchId!: string;

  @Column({ unique: true, name: "session_key" })
  sessionKey!: string;

  @Column({ unique: true, name: "access_token" })
  accessToken!: string;

  @Column({ name: "refresh_token" })
  refreshToken!: string;

  @Column({ type: "enum", enum: SessionStatus, default: SessionStatus.ACTIVE })
  status!: SessionStatus;

  @Column({ nullable: true, name: "ip_address" })
  ipAddress?: string;

  @Column({ nullable: true, name: "user_agent" })
  userAgent?: string;

  @Column({ type: "timestamp", nullable: true, name: "last_seen_at" })
  lastSeenAt?: Date;
}
