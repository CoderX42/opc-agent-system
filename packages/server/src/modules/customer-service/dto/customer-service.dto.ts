import { PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ConversationChannel,
  ConversationStatus,
} from '../entities/conversation.entity';
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
export class UpdateTicketDto extends PartialType(CreateTicketDto) {
  @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus;
}
export class TicketStatusDto {
  @IsEnum(TicketStatus) status: TicketStatus;
}
export class AssignTicketDto {
  @IsString() @MaxLength(100) assignee: string;
}
export class ResolveTicketDto {
  @IsString() @MaxLength(5000) resolution: string;
}
export class ConversationMessageDto {
  @IsString() @MaxLength(10_000) content: string;
}
class PageQueryDto {
  @IsOptional() @IsInt() @Min(1) page?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) pageSize?: number;
}
export class ConversationQueryDto extends PageQueryDto {
  @IsOptional() @IsEnum(ConversationStatus) status?: ConversationStatus;
  @IsOptional() @IsEnum(ConversationChannel) channel?: ConversationChannel;
  @IsOptional() @IsString() @MaxLength(100) keyword?: string;
}
export class TicketQueryDto extends PageQueryDto {
  @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus;
  @IsOptional() @IsEnum(TicketPriority) priority?: TicketPriority;
  @IsOptional() @IsString() @MaxLength(100) keyword?: string;
}
