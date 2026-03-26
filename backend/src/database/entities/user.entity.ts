import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./base.entity";

@Entity({ name: "users" })
export class User extends AppBaseEntity {
  @Column({ name: "branch_id" })
  branchId!: string;

  @Column({ name: "role_id" })
  roleId!: string;

  @Column({ unique: true })
  username!: string;

  @Column({ name: "password_hash" })
  passwordHash!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ default: true, name: "is_active" })
  isActive!: boolean;
}
