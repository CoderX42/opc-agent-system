import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class VoiceChatDto {
  @ApiPropertyOptional({ description: '已完成 ASR 的文本；当前优先使用该字段' })
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  text?: string;

  @ApiPropertyOptional({ description: '音频 URL 或上传后的文件标识' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  audioUrl?: string;

  @ApiPropertyOptional({ description: '会话 ID' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sessionId?: string;

  @ApiPropertyOptional({ description: '业务上下文' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
