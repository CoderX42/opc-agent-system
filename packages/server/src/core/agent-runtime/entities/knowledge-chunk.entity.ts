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

  // 桌面端用 SQLite 时 embedding 退化为 simple-json（向量压缩为字符串数组）；
  // PG 端用 pgvector 的 vector(length) 类型通过同一个实体的两种持久化方案。
  // 这里统一用 simple-json 存储以便 desktop/web 都能跑（如需向量检索请切回 PG + vector）。
  @Column({ type: 'simple-json', nullable: true })
  embedding: number[] | null;

  @Column({
    name: 'vector_status',
    type: 'simple-enum',
    enum: KnowledgeChunkVectorStatus,
    default: KnowledgeChunkVectorStatus.PENDING,
  })
  vectorStatus: KnowledgeChunkVectorStatus;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
