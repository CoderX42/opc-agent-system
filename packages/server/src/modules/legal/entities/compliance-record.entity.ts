import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('compliance_records')
@Index(['ownerId','status','createdAt'])
export class ComplianceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 50 })
  category: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: string;

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  responsiblePerson: string;

  @Column({ type: 'json', nullable: true })
  result: Record<string, unknown>;

  @Column({type:'uuid',name:'owner_id'})
  ownerId:string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
