import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ConversationChannel {
  WEB = 'WEB',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  WECHAT = 'WECHAT',
}

export enum ConversationStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  PENDING = 'PENDING',
}

@Entity('conversations')
@Index(['ownerId', 'status', 'updatedAt'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'simple-enum', enum: ConversationChannel })
  channel: ConversationChannel;

  @Column({ type: 'varchar', length: 100 })
  customerName: string;

  @Column({ type: 'simple-enum', enum: ConversationStatus, default: ConversationStatus.ACTIVE })
  status: ConversationStatus;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
