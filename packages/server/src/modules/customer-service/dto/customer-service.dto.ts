import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ConversationChannel } from '../entities/conversation.entity';
import { TicketPriority, TicketStatus } from '../entities/ticket.entity';

export class CreateConversationDto {
  @IsEnum(ConversationChannel) channel: ConversationChannel;
  @IsString() @MaxLength(100) customerName: string;
  @IsOptional() @IsString() @MaxLength(2000) summary?: string;
}
export class CreateTicketDto {
  @IsString() @MaxLength(200) title: string;
  @IsString() @MaxLength(10_000) description: string;
  @IsOptional() @IsEnum(TicketPriority) priority?: TicketPriority;
  @IsOptional() @IsUUID() conversationId?: string;
  @IsOptional() @IsString() @MaxLength(100) assignee?: string;
}
export class UpdateTicketDto extends PartialType(CreateTicketDto) { @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus; }
export class TicketStatusDto { @IsEnum(TicketStatus) status: TicketStatus; }
export class AssignTicketDto { @IsString() @MaxLength(100) assignee: string; }
export class ResolveTicketDto { @IsString() @MaxLength(5000) resolution: string; }
export class ConversationMessageDto { @IsString() @MaxLength(10_000) content: string; }
