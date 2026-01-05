import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum TenantPlan {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum TenantRegion {
  US_EAST = 'us-east',
  US_WEST = 'us-west',
  EU_WEST = 'eu-west',
  EU_CENTRAL = 'eu-central',
  AP_SOUTHEAST = 'ap-southeast',
}

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  subdomain: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeCustomerId: string;

  @Column({
    type: 'enum',
    enum: TenantRegion,
    default: TenantRegion.US_EAST,
  })
  region: TenantRegion;

  @Column({
    type: 'enum',
    enum: TenantPlan,
    default: TenantPlan.FREE,
  })
  plan: TenantPlan;

  @CreateDateColumn()
  createdAt: Date;
}