import { Column, CreateDateColumn, Entity, Index, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('conversation_messages')
@Index(['conversationId', 'createdAt'])
export class ConversationMessage {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'conversation_id' }) conversationId: string;
  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'conversation_id' }) conversation: Conversation;
  @Column({ type: 'varchar', length: 20 }) role: 'user' | 'agent' | 'system';
  @Column({ type: 'text' }) content: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
