import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { AgentService } from './agent.service';
import { AgentQueryDto } from './dto/agent-query.dto';
import { AgentChatDto, CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';
import { AgentStatus, AgentType } from './entities/agent.entity';

@ApiTags('Agent')
@ApiBearerAuth('JWT')
@Controller('agents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgentController {
  constructor(private readonly agents: AgentService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateAgentDto) { return this.agents.create(dto); }

  @Get()
  findAll(@Query() query: AgentQueryDto) { return this.agents.findAll(query); }

  @Get('active')
  active() { return this.agents.getActiveAgents(); }

  @Get('type/:type')
  byType(@Param('type') type: AgentType) { return this.agents.findByType(type); }

  @Post('type/:type/chat')
  chatByType(@Param('type') type: AgentType, @Body() dto: AgentChatDto) {
    return this.agents.chatByType(type, dto.message);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) { return this.agents.findOne(id); }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAgentDto) {
    return this.agents.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string) { await this.agents.remove(id); return null; }

  @Post(':id/start')
  @Roles(UserRole.ADMIN)
  start(@Param('id', ParseUUIDPipe) id: string) { return this.agents.setStatus(id, AgentStatus.ACTIVE); }

  @Post(':id/stop')
  @Roles(UserRole.ADMIN)
  stop(@Param('id', ParseUUIDPipe) id: string) { return this.agents.setStatus(id, AgentStatus.INACTIVE); }

  @Post(':id/chat')
  chat(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AgentChatDto) {
    return this.agents.chat(id, dto.message);
  }
}
