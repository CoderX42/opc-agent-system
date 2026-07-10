import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, MoreThanOrEqual, Repository } from "typeorm";
import { AiService } from "../../ai/ai.service";
import {
  Conversation,
  ConversationChannel,
  ConversationStatus,
} from "./entities/conversation.entity";
import { Ticket, TicketPriority, TicketStatus } from "./entities/ticket.entity";
import { ConversationMessage } from "./entities/message.entity";
import {
  ConversationQueryDto,
  CreateConversationDto,
  CreateTicketDto,
  TicketQueryDto,
  UpdateTicketDto,
} from "./dto/customer-service.dto";

interface AutoTicketDecision {
  shouldCreate: boolean;
  priority: TicketPriority;
  title: string;
  reason: string;
}

@Injectable()
export class CustomerServiceService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(ConversationMessage)
    private readonly messages: Repository<ConversationMessage>,
    private readonly ai: AiService,
  ) {}

  async createConversation(ownerId: string, dto: CreateConversationDto) {
    return this.conversations.save(
      this.conversations.create({ ...dto, ownerId }),
    );
  }

  async findAllConversations(
    ownerId: string,
    page = 1,
    limit = 10,
    filters: ConversationQueryDto = {},
  ) {
    const p = this.page(page, limit);
    const query = this.conversations
      .createQueryBuilder("conversation")
      .where("conversation.ownerId = :ownerId", { ownerId });

    if (filters.status)
      query.andWhere("conversation.status = :status", {
        status: filters.status,
      });
    if (filters.channel)
      query.andWhere("conversation.channel = :channel", {
        channel: filters.channel,
      });
    if (filters.keyword) {
      query.andWhere(
        new Brackets((builder) => {
          builder
            .where("conversation.customerName LIKE :keyword", {
              keyword: `%${filters.keyword}%`,
            })
            .orWhere("conversation.summary LIKE :keyword", {
              keyword: `%${filters.keyword}%`,
            });
        }),
      );
    }

    const [items, total] = await query
      .orderBy("conversation.updatedAt", "DESC")
      .skip(p.skip)
      .take(p.limit)
      .getManyAndCount();
    return { items, total, page: p.page, pageSize: p.limit };
  }

  async findOneConversation(ownerId: string, id: string) {
    const item = await this.conversations.findOne({ where: { id, ownerId } });
    if (!item) throw new NotFoundException(`Conversation #${id} not found`);
    return item;
  }

  async closeConversation(ownerId: string, id: string) {
    const item = await this.findOneConversation(ownerId, id);
    item.status = ConversationStatus.CLOSED;
    return this.conversations.save(item);
  }

  async getMessages(
    ownerId: string,
    conversationId: string,
    page = 1,
    limit = 50,
  ) {
    await this.findOneConversation(ownerId, conversationId);
    const p = this.page(page, limit);
    const [items, total] = await this.messages.findAndCount({
      where: { conversationId },
      skip: p.skip,
      take: p.limit,
      order: { createdAt: "ASC" },
    });
    return { items, total, page: p.page, pageSize: p.limit };
  }

  async sendMessage(ownerId: string, conversationId: string, content: string) {
    const conversation = await this.findOneConversation(
      ownerId,
      conversationId,
    );
    const recentMessages = await this.messages.find({
      where: { conversationId },
      order: { createdAt: "DESC" },
      take: 8,
    });
    const userMessage = await this.messages.save(
      this.messages.create({ conversationId, role: "user", content }),
    );
    const reply = await this.generateReply(
      conversation,
      [...recentMessages].reverse(),
      content,
    );
    const agentMessage = await this.messages.save(
      this.messages.create({ conversationId, role: "agent", content: reply }),
    );
    const ticket = await this.createTicketIfNeeded(
      ownerId,
      conversation,
      content,
    );

    conversation.summary = this.mergeSummary(conversation.summary, content);
    conversation.status = ticket
      ? ConversationStatus.PENDING
      : ConversationStatus.ACTIVE;
    await this.conversations.save(conversation);

    return { userMessage, reply: agentMessage, ticket };
  }

  async createTicket(ownerId: string, dto: CreateTicketDto) {
    if (dto.conversationId)
      await this.findOneConversation(ownerId, dto.conversationId);
    const { description, assignee, ...values } = dto;
    return this.tickets.save(
      this.tickets.create({
        ...values,
        content: description,
        assignedTo: assignee,
        ownerId,
      }),
    );
  }

  async createTicketFromConversation(
    ownerId: string,
    conversationId: string,
    dto?: Partial<CreateTicketDto>,
  ) {
    const conversation = await this.findOneConversation(
      ownerId,
      conversationId,
    );
    const recentMessages = await this.messages.find({
      where: { conversationId },
      order: { createdAt: "DESC" },
      take: 6,
    });
    const description =
      dto?.description ||
      this.buildTicketContent(
        conversation,
        recentMessages.reverse(),
        "人工创建",
      );
    const ticket = await this.createTicket(ownerId, {
      title: dto?.title || `${conversation.customerName} 的客服跟进`,
      description,
      priority: dto?.priority || TicketPriority.MEDIUM,
      conversationId,
      assignee: dto?.assignee,
    });
    conversation.status = ConversationStatus.PENDING;
    await this.conversations.save(conversation);
    return ticket;
  }

  async findAllTickets(
    ownerId: string,
    page = 1,
    limit = 10,
    filters: TicketQueryDto = {},
  ) {
    const p = this.page(page, limit);
    const query = this.tickets
      .createQueryBuilder("ticket")
      .leftJoinAndSelect("ticket.conversation", "conversation")
      .where("ticket.ownerId = :ownerId", { ownerId });

    if (filters.status)
      query.andWhere("ticket.status = :status", { status: filters.status });
    if (filters.priority)
      query.andWhere("ticket.priority = :priority", {
        priority: filters.priority,
      });
    if (filters.keyword) {
      query.andWhere(
        new Brackets((builder) => {
          builder
            .where("ticket.title LIKE :keyword", {
              keyword: `%${filters.keyword}%`,
            })
            .orWhere("ticket.content LIKE :keyword", {
              keyword: `%${filters.keyword}%`,
            })
            .orWhere("ticket.assignedTo LIKE :keyword", {
              keyword: `%${filters.keyword}%`,
            })
            .orWhere("conversation.customerName LIKE :keyword", {
              keyword: `%${filters.keyword}%`,
            });
        }),
      );
    }

    const [items, total] = await query
      .orderBy("ticket.createdAt", "DESC")
      .skip(p.skip)
      .take(p.limit)
      .getManyAndCount();
    return { items, total, page: p.page, pageSize: p.limit };
  }

  async findOneTicket(ownerId: string, id: string) {
    const item = await this.tickets.findOne({
      where: { id, ownerId },
      relations: ["conversation"],
    });
    if (!item) throw new NotFoundException(`Ticket #${id} not found`);
    return item;
  }

  async updateTicket(ownerId: string, id: string, dto: UpdateTicketDto) {
    const item = await this.findOneTicket(ownerId, id);
    const { description, assignee, ...values } = dto;
    Object.assign(item, values);
    if (description !== undefined) item.content = description;
    if (assignee !== undefined) item.assignedTo = assignee;
    this.syncResolutionFields(item, dto.status);
    return this.tickets.save(item);
  }

  async updateTicketStatus(ownerId: string, id: string, status: TicketStatus) {
    return this.updateTicket(ownerId, id, { status });
  }

  async assignTicket(ownerId: string, id: string, assignee: string) {
    return this.updateTicket(ownerId, id, {
      assignee,
      status: TicketStatus.IN_PROGRESS,
    });
  }

  async resolveTicket(ownerId: string, id: string, resolution: string) {
    const item = await this.findOneTicket(ownerId, id);
    item.status = TicketStatus.RESOLVED;
    item.resolution = resolution;
    item.resolvedAt = new Date();
    return this.tickets.save(item);
  }

  async removeTicket(ownerId: string, id: string) {
    await this.findOneTicket(ownerId, id);
    await this.tickets.delete({ id, ownerId });
  }

  async getStats(ownerId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [
      activeConversations,
      pendingTickets,
      inProgressTickets,
      resolvedTickets,
      todayMessages,
      resolvedToday,
      totalTickets,
    ] = await Promise.all([
      this.conversations.count({
        where: { ownerId, status: ConversationStatus.ACTIVE },
      }),
      this.tickets.count({ where: { ownerId, status: TicketStatus.OPEN } }),
      this.tickets.count({
        where: { ownerId, status: TicketStatus.IN_PROGRESS },
      }),
      this.tickets.count({ where: { ownerId, status: TicketStatus.RESOLVED } }),
      this.messages
        .createQueryBuilder("m")
        .innerJoin("m.conversation", "c")
        .where("c.ownerId = :ownerId AND m.createdAt >= :today", {
          ownerId,
          today,
        })
        .getCount(),
      this.tickets.count({
        where: {
          ownerId,
          status: TicketStatus.RESOLVED,
          resolvedAt: MoreThanOrEqual(today),
        },
      }),
      this.tickets.count({ where: { ownerId } }),
    ]);
    return {
      activeConversations,
      pendingTickets,
      openTickets: pendingTickets,
      inProgressTickets,
      resolvedTickets,
      avgResponseTime: 0,
      satisfactionRate: this.percent(resolvedTickets, totalTickets),
      todayMessages,
      resolvedToday,
    };
  }

  private async generateReply(
    conversation: Conversation,
    recentMessages: ConversationMessage[],
    content: string,
  ) {
    const context = recentMessages
      .map(
        (message) =>
          `${message.role === "user" ? "客户" : "客服"}：${message.content}`,
      )
      .join("\n");
    try {
      return await this.ai.simpleChat(
        `客户：${conversation.customerName}\n渠道：${conversation.channel}\n会话摘要：${conversation.summary || "暂无"}\n历史上下文：\n${context || "暂无"}\n最新问题：${content}`,
        "你是企业智能客服。基于上下文回答，语气友善专业；无法确定时明确说明，并给出下一步建议；涉及投诉、退款、合同、发票异常或客户要求人工时建议转人工。",
      );
    } catch {
      return "已收到您的消息。当前智能服务暂时不可用，工单已保留，请稍后重试或转人工处理。";
    }
  }

  private async createTicketIfNeeded(
    ownerId: string,
    conversation: Conversation,
    content: string,
  ) {
    const decision = this.analyzeTicketNeed(content);
    if (!decision.shouldCreate) return null;

    const existing = await this.tickets.findOne({
      where: {
        ownerId,
        conversationId: conversation.id,
        status: TicketStatus.OPEN,
      },
      order: { createdAt: "DESC" },
    });
    if (existing) return existing;

    return this.createTicket(ownerId, {
      title: decision.title,
      description: this.buildTicketContent(
        conversation,
        [],
        decision.reason,
        content,
      ),
      priority: decision.priority,
      conversationId: conversation.id,
    });
  }

  private analyzeTicketNeed(content: string): AutoTicketDecision {
    const normalized = content.toLowerCase();
    const urgentWords = [
      "投诉",
      "严重",
      "紧急",
      "马上",
      "立刻",
      "urgent",
      "asap",
    ];
    const highWords = [
      "退款",
      "退货",
      "发票",
      "合同",
      "赔偿",
      "人工",
      "客服",
      "转人工",
      "联系我",
      "回电",
    ];
    const shouldCreate = [...urgentWords, ...highWords].some((word) =>
      normalized.includes(word),
    );
    const priority = urgentWords.some((word) => normalized.includes(word))
      ? TicketPriority.URGENT
      : TicketPriority.HIGH;
    return {
      shouldCreate,
      priority,
      title:
        priority === TicketPriority.URGENT
          ? "紧急客户诉求需人工跟进"
          : "客户诉求需人工跟进",
      reason:
        priority === TicketPriority.URGENT
          ? "命中紧急/投诉类关键词"
          : "命中人工跟进类关键词",
    };
  }

  private buildTicketContent(
    conversation: Conversation,
    messages: ConversationMessage[],
    reason: string,
    latestContent?: string,
  ) {
    const history = messages.length
      ? messages
          .map((message) => `${message.role}: ${message.content}`)
          .join("\n")
      : latestContent || "暂无消息记录";
    return [
      `客户：${conversation.customerName}`,
      `渠道：${conversation.channel}`,
      `原因：${reason}`,
      `摘要：${conversation.summary || "暂无"}`,
      `记录：\n${history}`,
    ].join("\n");
  }

  private mergeSummary(summary: string | null, content: string) {
    const next = summary ? `${summary}；${content}` : content;
    return next.length > 500 ? next.slice(next.length - 500) : next;
  }

  private syncResolutionFields(ticket: Ticket, status?: TicketStatus) {
    if (status === TicketStatus.RESOLVED && !ticket.resolvedAt)
      ticket.resolvedAt = new Date();
    if (status === TicketStatus.OPEN || status === TicketStatus.IN_PROGRESS)
      ticket.resolvedAt = null;
  }

  private percent(value: number, total: number) {
    return total ? Math.round((value / total) * 100) : 100;
  }

  private page(page: number, limit: number) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
    return {
      page: safePage,
      limit: safeLimit,
      skip: (safePage - 1) * safeLimit,
    };
  }
}
