import { Injectable } from '@nestjs/common';
import { AgentType } from '../../../modules/agent/entities/agent.entity';
import { CustomerServiceService } from '../../../modules/customer-service/customer-service.service';
import { AgentTool, AgentToolContext } from '../agent-runtime.types';

@Injectable()
export class QueryCustomerTool implements AgentTool {
  name = 'customer.query';
  description = '查询客户会话和工单信息';
  supportedAgentTypes = [AgentType.CUSTOMER_SERVICE];

  constructor(private readonly customer: CustomerServiceService) {}

  async execute(context: AgentToolContext): Promise<unknown> {
    const keyword = this.extractKeyword(context.input);
    const [conversations, tickets] = await Promise.all([
      this.customer.findAllConversations(context.userId, 1, 10, { keyword }),
      this.customer.findAllTickets(context.userId, 1, 10, { keyword }),
    ]);
    return { conversations, tickets };
  }

  private extractKeyword(input: string): string | undefined {
    const trimmed = input.trim();
    return trimmed.length > 2 ? trimmed.slice(0, 40) : undefined;
  }
}

@Injectable()
export class CreateTicketTool implements AgentTool {
  name = 'customer.create_ticket';
  description = '根据用户输入创建客服工单';
  supportedAgentTypes = [AgentType.CUSTOMER_SERVICE];

  constructor(private readonly customer: CustomerServiceService) {}

  async execute(context: AgentToolContext): Promise<unknown> {
    const title = String(context.metadata?.title || context.input).slice(0, 120);
    return this.customer.createTicket(context.userId, {
      title,
      description: context.input,
      priority: undefined,
      conversationId: undefined,
      assignee: undefined,
    });
  }
}
