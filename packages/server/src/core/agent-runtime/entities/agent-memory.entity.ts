import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AgentMemoryType {
  USER_PREFERENCE = 'USER_PREFERENCE',
  ENTERPRISE_INFO = 'ENTERPRISE_INFO',
  HISTORICAL_DECISION = 'HISTORICAL_DECISION',
  CUSTOMER_RELATIONSHIP = 'CUSTOMER_RELATIONSHIP',
  CONVERSATION_SUMMARY = 'CONVERSATION_SUMMARY',
}

@Entity('agent_memories')
@Index(['userId', 'memoryType'])
@Index(['agentId', 'scope'])
export class AgentMemory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'agent_id', type: 'uuid', nullable: true })
  agentId: string | null;

  @Column({ name: 'memory_type', type: 'simple-enum', enum: AgentMemoryType })
  memoryType: AgentMemoryType;

  @Column({ type: 'varchar', length: 80, default: 'default' })
  scope: string;

  @Column({ type: 'varchar', length: 160 })
  key: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'int', default: 1 })
  importance: number;

  @Column({ name: 'last_accessed_at', type: 'datetime', nullable: true })
  lastAccessedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
