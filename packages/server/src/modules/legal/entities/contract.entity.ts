import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ContractType {
  SALES = 'SALES',
  PURCHASE = 'PURCHASE',
  SERVICE = 'SERVICE',
  NDA = 'NDA',
  EMPLOYMENT = 'EMPLOYMENT',
  OTHER = 'OTHER',
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  REVIEWING = 'REVIEWING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SIGNED = 'SIGNED',
  EXPIRED = 'EXPIRED',
}

@Entity('contracts')
@Index(['ownerId','status','updatedAt'])
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'simple-enum', enum: ContractType })
  type: ContractType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-enum', enum: ContractStatus, default: ContractStatus.DRAFT })
  status: ContractStatus;

  @Column({ type: 'simple-json', nullable: true })
  reviewResult: Record<string, unknown>;

  @Column({ type:'decimal', precision:12, scale:2, nullable:true })
  amount: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  partyA: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  partyB: string;

  @Column({ type: 'date', nullable: true })
  signDate: Date;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  @Column({type:'uuid',name:'owner_id'})
  ownerId:string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
