import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../../ai/ai.module';
import { Agent } from '../../modules/agent/entities/agent.entity';
import { AdminModule } from '../../modules/admin/admin.module';
import { CustomerServiceModule } from '../../modules/customer-service/customer-service.module';
import { FinanceModule } from '../../modules/finance/finance.module';
import { Knowledge } from '../../modules/knowledge/entities/knowledge.entity';
import { LegalModule } from '../../modules/legal/legal.module';
import { AgentExecutor } from './agent-executor.service';
import { AgentRuntimeController } from './agent-runtime.controller';
import { AgentTaskService } from './agent-task.service';
import { AgentMemory } from './entities/agent-memory.entity';
import { AgentTask } from './entities/agent-task.entity';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity';
import { AgentMemoryService } from './memory/agent-memory.service';
import { KnowledgeVectorService } from './rag/knowledge-vector.service';
import { SupervisorAgentService } from './supervisor-agent.service';
import { CreateAdminTaskTool, CreateScheduleTool } from './tools/admin.tools';
import { AgentToolRegistry } from './tools/agent-tool-registry.service';
import { CreateTicketTool, QueryCustomerTool } from './tools/customer.tools';
import { FinanceAnalysisTool, QueryExpenseTool, QueryIncomeTool } from './tools/finance.tools';
import { ContractAnalysisTool, RiskDetectionTool } from './tools/legal.tools';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, AgentTask, AgentMemory, KnowledgeChunk, Knowledge]),
    AiModule,
    FinanceModule,
    CustomerServiceModule,
    LegalModule,
    AdminModule,
  ],
  controllers: [AgentRuntimeController],
  providers: [
    AgentExecutor,
    AgentTaskService,
    SupervisorAgentService,
    AgentMemoryService,
    KnowledgeVectorService,
    AgentToolRegistry,
    QueryIncomeTool,
    QueryExpenseTool,
    FinanceAnalysisTool,
    QueryCustomerTool,
    CreateTicketTool,
    ContractAnalysisTool,
    RiskDetectionTool,
    CreateAdminTaskTool,
    CreateScheduleTool,
  ],
  exports: [AgentExecutor, AgentTaskService, SupervisorAgentService, AgentMemoryService],
})
export class AgentRuntimeModule {}
