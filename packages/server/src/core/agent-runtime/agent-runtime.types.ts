import { AgentType } from '../../modules/agent/entities/agent.entity';
import { AgentTask } from './entities/agent-task.entity';

export interface AgentExecutionInput {
  taskId?: string;
  userId: string;
  agentId?: string;
  agentType?: AgentType;
  taskType: string;
  message: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  tools?: string[];
}

export interface AgentExecutionResult {
  task: AgentTask;
  reply: string;
  agentType: AgentType | null;
  toolResults: AgentToolResult[];
  references: AgentReference[];
}

export interface AgentReference {
  id: string;
  title: string;
  category: string;
  relevanceScore: number;
}

export interface AgentToolContext {
  userId: string;
  agentType: AgentType;
  taskId?: string;
  input: string;
  metadata?: Record<string, unknown>;
}

export interface AgentToolResult {
  tool: string;
  output: unknown;
}

export interface AgentTool {
  name: string;
  description: string;
  supportedAgentTypes: AgentType[];
  execute(context: AgentToolContext): Promise<unknown>;
}

export interface SupervisorPlan {
  intent: string;
  agents: AgentType[];
  steps: { agentType: AgentType; taskType: string; reason: string }[];
}
