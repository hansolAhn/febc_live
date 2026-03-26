import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./base.entity";
import { UserRole } from "src/common/enums";

@Entity({ name: "roles" })
export class Role extends AppBaseEntity {
  @Column({ type: "enum", enum: UserRole, unique: true })
  code!: UserRole;

  @Column()
  name!: string;
}
