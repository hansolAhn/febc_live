import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./base.entity";

@Entity({ name: "branches" })
export class Branch extends AppBaseEntity {
  @Column({ unique: true })
  code!: string;

  @Column()
  name!: string;

  @Column({ default: true, name: "is_active" })
  isActive!: boolean;
}
