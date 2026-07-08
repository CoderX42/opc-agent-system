import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AgentExecutor } from './agent-executor.service';
import { AgentTaskService } from './agent-task.service';
import { ExecuteAgentTaskDto, SupervisorTaskDto, UpsertAgentMemoryDto } from './dto/agent-runtime.dto';
import { AgentMemoryService } from './memory/agent-memory.service';
import { SupervisorAgentService } from './supervisor-agent.service';

interface AuthRequest extends Request {
  user: { id: string };
}

@ApiTags('Agent Runtime')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agent-runtime')
export class AgentRuntimeController {
  constructor(
    private readonly executor: AgentExecutor,
    private readonly tasks: AgentTaskService,
    private readonly supervisor: SupervisorAgentService,
    private readonly memory: AgentMemoryService,
  ) {}

  @Post('tasks')
  executeTask(@Request() req: AuthRequest, @Body() dto: ExecuteAgentTaskDto) {
    return this.executor.execute({
      userId: req.user.id,
      agentId: dto.agentId,
      agentType: dto.agentType,
      taskType: dto.taskType,
      message: dto.message,
      sessionId: dto.sessionId,
      metadata: dto.metadata,
      tools: dto.tools,
    });
  }

  @Get('tasks/:id')
  findTask(@Request() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.tasks.findOne(id, req.user.id);
  }

  @Post('supervise')
  supervise(@Request() req: AuthRequest, @Body() dto: SupervisorTaskDto) {
    return this.supervisor.execute(req.user.id, dto);
  }

  @Post('memories')
  upsertMemory(@Request() req: AuthRequest, @Body() dto: UpsertAgentMemoryDto) {
    return this.memory.upsertLongTerm({
      userId: req.user.id,
      agentId: dto.agentId,
      memoryType: dto.memoryType,
      scope: dto.scope,
      key: dto.key,
      content: dto.content,
      metadata: dto.metadata,
      importance: dto.importance,
    });
  }
}
