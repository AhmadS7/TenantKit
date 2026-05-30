import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';
import { Tenant } from '../tenancy/tenant.entity';

export enum MembershipRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export enum MembershipStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

@Entity('memberships')
@Index(['userId', 'tenantId'], { unique: true })
export class Membership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'enum', enum: MembershipRole, default: MembershipRole.MEMBER })
  role: MembershipRole;

  @Column({ type: 'enum', enum: MembershipStatus, default: MembershipStatus.PENDING })
  status: MembershipStatus;

  @Column({ type: 'uuid', nullable: true })
  invitedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;
}