import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AgentType } from '../../../modules/agent/entities/agent.entity';

export enum AgentTaskStatus {
  WAITING = 'WAITING',
  PLANNING = 'PLANNING',
  RUNNING = 'RUNNING',
  TOOL_CALLING = 'TOOL_CALLING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('agent_tasks')
@Index(['userId', 'status'])
@Index(['agentId', 'createdAt'])
export class AgentTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agent_id', type: 'uuid', nullable: true })
  agentId: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'task_type', type: 'varchar', length: 80 })
  taskType: string;

  @Column({ type: 'simple-enum', enum: AgentTaskStatus, default: AgentTaskStatus.WAITING })
  status: AgentTaskStatus;

  @Column({ name: 'agent_type', type: 'simple-enum', enum: AgentType, nullable: true })
  agentType: AgentType | null;

  @Column({ type: 'simple-json' })
  input: Record<string, unknown>;

  @Column({ type: 'simple-json', nullable: true })
  plan: Record<string, unknown> | null;

  @Column({ type: 'simple-json', nullable: true })
  result: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
