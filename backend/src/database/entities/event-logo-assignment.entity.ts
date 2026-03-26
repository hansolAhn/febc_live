import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./base.entity";

@Entity({ name: "event_logo_assignments" })
export class EventLogoAssignment extends AppBaseEntity {
  @Column({ name: "event_code" })
  eventCode!: string;

  @Column({ name: "branch_code" })
  branchCode!: string;

  @Column({ name: "profile_id" })
  profileId!: string;

  @Column({ name: "session_code" })
  sessionCode!: string;

  @Column({ type: "jsonb", name: "visible_overlay_payload", default: {} })
  visibleOverlayPayload!: Record<string, unknown>;

  @Column({ type: "jsonb", name: "hidden_overlay_payload", default: {} })
  hiddenOverlayPayload!: Record<string, unknown>;
}
