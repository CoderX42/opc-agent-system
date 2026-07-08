import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum KnowledgeChunkVectorStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  FAILED = 'FAILED',
}

@Entity('knowledge_chunks')
@Index(['knowledgeId', 'chunkIndex'], { unique: true })
@Index(['vectorStatus'])
export class KnowledgeChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'knowledge_id', type: 'uuid' })
  knowledgeId: string;

  @Column({ name: 'chunk_index', type: 'int' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'token_count', type: 'int', default: 0 })
  tokenCount: number;

  @Column({ type: 'vector', length: 1536, nullable: true })
  embedding: number[] | null;

  @Column({
    name: 'vector_status',
    type: 'enum',
    enum: KnowledgeChunkVectorStatus,
    default: KnowledgeChunkVectorStatus.PENDING,
  })
  vectorStatus: KnowledgeChunkVectorStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
