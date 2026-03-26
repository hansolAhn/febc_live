import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./base.entity";

@Entity({ name: "branch_logo_fingerprint_profiles" })
export class BranchLogoFingerprintProfile extends AppBaseEntity {
  @Column({ name: "branch_code" })
  branchCode!: string;

  @Column({ name: "profile_version" })
  profileVersion!: number;

  @Column({ name: "profile_name" })
  profileName!: string;

  @Column({ type: "jsonb", name: "visible_watermark_config", default: {} })
  visibleWatermarkConfig!: Record<string, unknown>;

  @Column({ type: "jsonb", name: "hidden_watermark_config", default: {} })
  hiddenWatermarkConfig!: Record<string, unknown>;

  @Column({ default: true, name: "is_active" })
  isActive!: boolean;
}
