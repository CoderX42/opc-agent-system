import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VoiceChatDto } from './dto/voice-chat.dto';
import { VoiceService } from './voice.service';

interface AuthRequest extends Request {
  user: { id: string };
}

@ApiTags('Voice Assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('voice')
export class VoiceController {
  constructor(private readonly voice: VoiceService) {}

  @Post('chat')
  chat(@Request() req: AuthRequest, @Body() dto: VoiceChatDto) {
    return this.voice.chat(req.user.id, dto);
  }
}
