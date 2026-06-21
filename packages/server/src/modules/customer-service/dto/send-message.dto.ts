import { IsNotEmpty, IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationChannel } from '../entities/conversation.entity';

export class SendMessageDto {
  @ApiProperty({ description: '会话ID' })
  @IsNotEmpty()
  @IsUUID()
  conversationId: string;

  @ApiProperty({ description: '消息内容' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: '发送渠道' })
  @IsOptional()
  @IsEnum(ConversationChannel)
  channel?: ConversationChannel;
}
