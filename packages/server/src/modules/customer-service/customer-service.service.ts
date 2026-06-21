import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { AiService } from '../../ai/ai.service';
import { Conversation, ConversationStatus } from './entities/conversation.entity';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { ConversationMessage } from './entities/message.entity';
import { CreateConversationDto, CreateTicketDto, UpdateTicketDto } from './dto/customer-service.dto';

@Injectable()
export class CustomerServiceService {
  constructor(
    @InjectRepository(Conversation) private readonly conversations: Repository<Conversation>,
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(ConversationMessage) private readonly messages: Repository<ConversationMessage>,
    private readonly ai: AiService,
  ) {}
  async createConversation(ownerId: string, dto: CreateConversationDto) { return this.conversations.save(this.conversations.create({ ...dto, ownerId })); }
  async findAllConversations(ownerId: string, page = 1, limit = 10, status?: ConversationStatus) {
    const p = this.page(page, limit); const [items, total] = await this.conversations.findAndCount({ where: { ownerId, ...(status ? { status } : {}) }, skip: p.skip, take: p.limit, order: { updatedAt: 'DESC' } });
    return { items, total, page: p.page, pageSize: p.limit };
  }
  async findOneConversation(ownerId: string, id: string) { const item = await this.conversations.findOne({ where: { id, ownerId } }); if (!item) throw new NotFoundException(`Conversation #${id} not found`); return item; }
  async closeConversation(ownerId: string, id: string) { const item = await this.findOneConversation(ownerId, id); item.status = ConversationStatus.CLOSED; return this.conversations.save(item); }
  async getMessages(ownerId: string, conversationId: string, page = 1, limit = 50) { await this.findOneConversation(ownerId, conversationId); const p = this.page(page, limit); const [items, total] = await this.messages.findAndCount({ where: { conversationId }, skip: p.skip, take: p.limit, order: { createdAt: 'ASC' } }); return { items, total, page: p.page, pageSize: p.limit }; }
  async sendMessage(ownerId: string, conversationId: string, content: string) {
    const conversation = await this.findOneConversation(ownerId, conversationId);
    const userMessage = await this.messages.save(this.messages.create({ conversationId, role: 'user', content }));
    let reply: string;
    try { reply = await this.ai.simpleChat(content, '你是企业智能客服。回答要准确、友善、简洁；信息不足时说明并建议转人工。'); }
    catch { reply = '已收到您的消息。当前智能服务暂时不可用，工单已保留，请稍后重试或转人工处理。'; }
    const agentMessage = await this.messages.save(this.messages.create({ conversationId, role: 'agent', content: reply }));
    conversation.updatedAt = new Date(); await this.conversations.save(conversation);
    return { userMessage, reply: agentMessage };
  }
  async createTicket(ownerId: string, dto: CreateTicketDto) { if (dto.conversationId) await this.findOneConversation(ownerId, dto.conversationId); const { description, assignee, ...values } = dto; return this.tickets.save(this.tickets.create({ ...values, content: description, assignedTo: assignee, ownerId })); }
  async findAllTickets(ownerId: string, page = 1, limit = 10, status?: TicketStatus) { const p = this.page(page, limit); const [items, total] = await this.tickets.findAndCount({ where: { ownerId, ...(status ? { status } : {}) }, relations: ['conversation'], skip: p.skip, take: p.limit, order: { createdAt: 'DESC' } }); return { items, total, page: p.page, pageSize: p.limit }; }
  async findOneTicket(ownerId: string, id: string) { const item = await this.tickets.findOne({ where: { id, ownerId }, relations: ['conversation'] }); if (!item) throw new NotFoundException(`Ticket #${id} not found`); return item; }
  async updateTicket(ownerId: string, id: string, dto: UpdateTicketDto) { const item = await this.findOneTicket(ownerId, id); const { description, assignee, ...values } = dto; Object.assign(item, values); if (description) item.content = description; if (assignee) item.assignedTo = assignee; return this.tickets.save(item); }
  async updateTicketStatus(ownerId: string, id: string, status: TicketStatus) { return this.updateTicket(ownerId, id, { status }); }
  async assignTicket(ownerId: string, id: string, assignee: string) { return this.updateTicket(ownerId, id, { assignee, status: TicketStatus.IN_PROGRESS }); }
  async resolveTicket(ownerId: string, id: string, resolution: string) { const item = await this.findOneTicket(ownerId, id); item.status = TicketStatus.RESOLVED; item.resolution = resolution; item.resolvedAt = new Date(); return this.tickets.save(item); }
  async removeTicket(ownerId: string, id: string) { await this.findOneTicket(ownerId, id); await this.tickets.delete({ id, ownerId }); }
  async getStats(ownerId: string) { const today = new Date(); today.setHours(0,0,0,0); const [activeConversations, pendingTickets, resolvedTickets, todayMessages, resolvedToday] = await Promise.all([this.conversations.count({ where: { ownerId, status: ConversationStatus.ACTIVE } }), this.tickets.count({ where: { ownerId, status: TicketStatus.OPEN } }), this.tickets.count({ where: { ownerId, status: TicketStatus.RESOLVED } }), this.messages.createQueryBuilder('m').innerJoin('m.conversation','c').where('c.ownerId = :ownerId AND m.createdAt >= :today',{ownerId,today}).getCount(), this.tickets.count({ where: { ownerId, status: TicketStatus.RESOLVED, resolvedAt: MoreThanOrEqual(today) } })]); return { activeConversations, pendingTickets, openTickets: pendingTickets, resolvedTickets, avgResponseTime: 0, satisfactionRate: 100, todayMessages, resolvedToday }; }
  private page(page: number, limit: number) { const safePage=Math.max(1,Number(page)||1); const safeLimit=Math.min(100,Math.max(1,Number(limit)||10)); return {page:safePage,limit:safeLimit,skip:(safePage-1)*safeLimit}; }
}
