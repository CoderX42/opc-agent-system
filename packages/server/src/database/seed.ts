import { hash } from 'bcryptjs';
import AppDataSource from './data-source';
import { Agent, AgentStatus, AgentType } from '../modules/agent/entities/agent.entity';
import { Knowledge } from '../modules/knowledge/entities/knowledge.entity';
import { User, UserRole, UserStatus } from '../modules/user/entities/user.entity';
import {
  Conversation,
  ConversationChannel,
  ConversationStatus,
} from '../modules/customer-service/entities/conversation.entity';
import { ConversationMessage } from '../modules/customer-service/entities/message.entity';
import {
  Ticket,
  TicketPriority,
  TicketStatus,
} from '../modules/customer-service/entities/ticket.entity';
import {
  Contract,
  ContractStatus,
  ContractType,
} from '../modules/legal/entities/contract.entity';
import { ComplianceRecord } from '../modules/legal/entities/compliance-record.entity';
import { Task, TaskPriority, TaskStatus } from '../modules/admin/entities/task.entity';
import { Schedule } from '../modules/admin/entities/schedule.entity';
import { Meeting } from '../modules/admin/entities/meeting.entity';

const SEED_TAG = '[DEMO-50]';

function daysFromNow(days: number, hour = 9, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function pick<T>(items: T[], index: number): T {
  return items[index % items.length];
}

function numbered(index: number) {
  return String(index + 1).padStart(2, '0');
}

async function seed() {
  await AppDataSource.initialize();

  const users = AppDataSource.getRepository(User);
  const username = process.env.SEED_ADMIN_USERNAME || 'admin';
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@opc.local';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
  let admin = await users.findOne({ where: { username } });
  if (!admin) {
    admin = await users.save(
      users.create({
        username,
        email,
        password: await hash(password, 12),
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      }),
    );
  }

  const agents = AppDataSource.getRepository(Agent);
  const agentSeeds: Array<Pick<Agent, 'name' | 'type' | 'status' | 'config'>> = [
    { name: '财务助理', type: AgentType.FINANCE, status: AgentStatus.ACTIVE, config: {} },
    { name: '客服助理', type: AgentType.CUSTOMER_SERVICE, status: AgentStatus.ACTIVE, config: {} },
    { name: '法务助理', type: AgentType.LEGAL, status: AgentStatus.ACTIVE, config: {} },
    { name: '行政助理', type: AgentType.ADMIN, status: AgentStatus.ACTIVE, config: {} },
  ];
  for (const item of agentSeeds) {
    if (!(await agents.findOne({ where: { type: item.type } }))) {
      await agents.save(agents.create(item));
    }
  }

  const knowledge = AppDataSource.getRepository(Knowledge);
  const title = 'OPC 系统使用说明';
  if (!(await knowledge.findOne({ where: { title } }))) {
    await knowledge.save(
      knowledge.create({
        title,
        category: 'SYSTEM',
        content: '本系统提供财务、客服、法务和行政四类数字员工能力。关键操作应由用户确认后执行。',
        summary: '系统能力与人工确认原则',
        tags: ['系统', '使用说明'],
        status: 'PUBLISHED',
        authorId: admin.id,
      }),
    );
  }

  await seedCustomerServiceData(admin.id);
  await seedLegalData(admin.id);
  await seedAdminData(admin.id);

  await AppDataSource.destroy();
  console.log(`Seed complete: admin=${username}, agents=${agentSeeds.length}, demoTag=${SEED_TAG}`);
}

async function seedCustomerServiceData(ownerId: string) {
  const conversations = AppDataSource.getRepository(Conversation);
  const messages = AppDataSource.getRepository(ConversationMessage);
  const tickets = AppDataSource.getRepository(Ticket);
  const existing = await conversations
    .createQueryBuilder('conversation')
    .where('conversation.ownerId = :ownerId', { ownerId })
    .andWhere('conversation.summary LIKE :tag', { tag: `${SEED_TAG}%` })
    .getCount();
  if (existing >= 25) return;

  const customerNames = [
    '上海星河科技', '杭州青岚电商', '北京云栖教育', '深圳万象零售', '成都锦城餐饮',
    '苏州澄湖制造', '广州榕树健康', '南京北辰物流', '武汉江汉文旅', '厦门海屿贸易',
  ];
  const channels = [ConversationChannel.WEB, ConversationChannel.EMAIL, ConversationChannel.PHONE, ConversationChannel.WECHAT];
  const statuses = [ConversationStatus.ACTIVE, ConversationStatus.PENDING, ConversationStatus.CLOSED];
  const scenarios = [
    '订单发货进度查询，客户希望获取预计到达时间',
    '发票抬头需要修改，涉及增值税专票信息核对',
    '售后退换货申请，客户反馈包装破损且配件缺失',
    '企业套餐续费咨询，需要销售与客服协同跟进',
    '系统登录失败，客户怀疑账号权限被误调整',
  ];

  for (let i = existing; i < 25; i += 1) {
    const no = numbered(i);
    const scenario = pick(scenarios, i);
    const conversation = await conversations.save(
      conversations.create({
        customerName: `${pick(customerNames, i)} 客户${no}`,
        channel: pick(channels, i),
        status: pick(statuses, i),
        summary: `${SEED_TAG} ${scenario}；当前处理节点：${pick(['初步响应', '等待客户补充材料', '已转二线核实', '已给出解决方案'], i)}。`,
        ownerId,
      }),
    );

    await messages.save([
      messages.create({
        conversationId: conversation.id,
        role: 'user',
        content: `${SEED_TAG} 您好，我们遇到问题：${scenario}。请帮忙确认处理方案。`,
      }),
      messages.create({
        conversationId: conversation.id,
        role: 'agent',
        content: `已收到。客服Agent已记录诉求，并建议先核对订单号、联系人和补充材料，预计 ${pick(['2小时', '半个工作日', '1个工作日'], i)} 内反馈。`,
      }),
    ]);
  }

  const existingTickets = await tickets
    .createQueryBuilder('ticket')
    .where('ticket.ownerId = :ownerId', { ownerId })
    .andWhere('ticket.title LIKE :tag', { tag: `${SEED_TAG}%` })
    .getCount();
  if (existingTickets >= 25) return;

  const linkedConversations = await conversations.find({
    where: { ownerId },
    order: { createdAt: 'DESC' },
    take: 25,
  });
  const priorities = [TicketPriority.LOW, TicketPriority.MEDIUM, TicketPriority.HIGH, TicketPriority.URGENT];
  const ticketStatuses = [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED];
  const assignees = ['张敏', '李航', '王璐', '赵一鸣', '陈雨'];
  for (let i = existingTickets; i < 25; i += 1) {
    const status = pick(ticketStatuses, i);
    await tickets.save(
      tickets.create({
        title: `${SEED_TAG} 客服工单 ${numbered(i)} - ${pick(['发票信息修正', '售后退换货', '账号权限恢复', '物流异常跟踪', '套餐续费支持'], i)}`,
        content: `客户问题描述完整，需跟进责任人、SLA时限和最终解决结果。关联场景：${pick(scenarios, i)}。`,
        priority: pick(priorities, i),
        status,
        assignedTo: pick(assignees, i),
        resolution: status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED
          ? '已完成客户回访，客户确认问题解决。'
          : null,
        resolvedAt: status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED ? daysFromNow(-i) : null,
        conversationId: linkedConversations[i % linkedConversations.length]?.id,
        ownerId,
      }),
    );
  }
}

async function seedLegalData(ownerId: string) {
  const contracts = AppDataSource.getRepository(Contract);
  const compliance = AppDataSource.getRepository(ComplianceRecord);
  const existingContracts = await contracts
    .createQueryBuilder('contract')
    .where('contract.ownerId = :ownerId', { ownerId })
    .andWhere('contract.title LIKE :tag', { tag: `${SEED_TAG}%` })
    .getCount();

  const contractTypes = [ContractType.SALES, ContractType.PURCHASE, ContractType.SERVICE, ContractType.NDA, ContractType.EMPLOYMENT, ContractType.OTHER];
  const contractStatuses = [ContractStatus.DRAFT, ContractStatus.REVIEWING, ContractStatus.APPROVED, ContractStatus.REJECTED, ContractStatus.SIGNED, ContractStatus.EXPIRED];
  const parties = ['星河科技', '青岚电商', '北辰物流', '澄湖制造', '榕树健康', '江汉文旅'];
  for (let i = existingContracts; i < 30; i += 1) {
    const status = pick(contractStatuses, i);
    await contracts.save(
      contracts.create({
        title: `${SEED_TAG} ${pick(['软件服务', '采购框架', '渠道合作', '保密协议', '劳动聘用', '数据处理'], i)}合同 ${numbered(i)}`,
        type: pick(contractTypes, i),
        content: `合同背景：双方围绕业务合作、交付验收、费用结算和保密义务达成一致。重点条款包括付款节点、违约责任、数据安全、知识产权归属和争议解决。${SEED_TAG}`,
        status,
        reviewResult: {
          riskLevel: pick(['LOW', 'MEDIUM', 'HIGH'], i),
          issues: ['付款节点需明确验收标准', '违约责任上限建议补充', '保密期限需与业务周期匹配'].slice(0, (i % 3) + 1),
          suggestions: ['补充交付清单', '明确逾期付款利息', '增加数据删除和审计条款'],
          summary: '测试合同已生成规则化审查结果，便于页面展示风险项。',
        },
        amount: 50000 + i * 8800,
        partyA: `OPC智能运营中心`,
        partyB: `${pick(parties, i)}有限公司`,
        signDate: daysFromNow(-60 + i),
        expiryDate: daysFromNow(180 + i * 3),
        ownerId,
      }),
    );
  }

  const existingCompliance = await compliance
    .createQueryBuilder('record')
    .where('record.ownerId = :ownerId', { ownerId })
    .andWhere('record.title LIKE :tag', { tag: `${SEED_TAG}%` })
    .getCount();
  const categories = ['数据合规', '劳动用工', '广告宣传', '财税合规', '合同归档'];
  const complianceStatuses = ['PENDING', 'PASS', 'FAIL', 'REVIEWING'];
  for (let i = existingCompliance; i < 20; i += 1) {
    const status = pick(complianceStatuses, i);
    await compliance.save(
      compliance.create({
        title: `${SEED_TAG} 合规检查 ${numbered(i)} - ${pick(categories, i)}`,
        category: pick(categories, i),
        description: `检查范围包括制度文件、审批记录、证据材料和整改闭环。重点关注 ${pick(['授权留痕', '个人信息最小化', '劳动合同续签', '宣传用语真实性', '发票与合同一致性'], i)}。`,
        status,
        dueDate: daysFromNow(i - 8),
        responsiblePerson: pick(['韩梅', '许诺', '林舟', '周琪', '郑源'], i),
        result: {
          checkedAt: daysFromNow(-i).toISOString(),
          reason: status === 'FAIL' ? '存在逾期整改项或材料缺失。' : '当前材料满足测试检查要求。',
        },
        ownerId,
      }),
    );
  }
}

async function seedAdminData(userId: string) {
  const tasks = AppDataSource.getRepository(Task);
  const schedules = AppDataSource.getRepository(Schedule);
  const meetings = AppDataSource.getRepository(Meeting);

  const existingTasks = await tasks
    .createQueryBuilder('task')
    .where('task.creatorId = :userId', { userId })
    .andWhere('task.title LIKE :tag', { tag: `${SEED_TAG}%` })
    .getCount();
  const taskPriorities = [TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH];
  const taskStatuses = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE];
  for (let i = existingTasks; i < 20; i += 1) {
    await tasks.save(
      tasks.create({
        title: `${SEED_TAG} 行政任务 ${numbered(i)} - ${pick(['办公用品采购', '访客接待安排', '月度资产盘点', '制度流程更新', '员工活动筹备'], i)}`,
        description: `任务要求：明确负责人、截止时间、协同部门和验收标准。需在行政Agent中跟踪进度与风险。`,
        priority: pick(taskPriorities, i),
        status: pick(taskStatuses, i),
        dueDate: daysFromNow(i - 6),
        assigneeId: userId,
        creatorId: userId,
      }),
    );
  }

  const existingSchedules = await schedules
    .createQueryBuilder('schedule')
    .where('schedule.userId = :userId', { userId })
    .andWhere('schedule.title LIKE :tag', { tag: `${SEED_TAG}%` })
    .getCount();
  const scheduleTypes = ['PERSONAL', 'TEAM', 'REMINDER', 'VISITOR'];
  const locations = ['A座 8F 前台', 'B座 3F 会议室', '线上飞书会议', '园区接待中心', '行政办公室'];
  for (let i = existingSchedules; i < 15; i += 1) {
    const start = daysFromNow(i - 3, 9 + (i % 8), i % 2 ? 30 : 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    await schedules.save(
      schedules.create({
        title: `${SEED_TAG} 行政日程 ${numbered(i)} - ${pick(['访客登记', '会议室巡检', '证照年检提醒', '办公区巡查', '快递供应商沟通'], i)}`,
        description: '用于验证行政日历、今日事项和跨天日程展示效果。',
        startTime: start,
        endTime: end,
        type: pick(scheduleTypes, i),
        location: pick(locations, i),
        userId,
        isAllDay: i % 7 === 0,
      }),
    );
  }

  const existingMeetings = await meetings
    .createQueryBuilder('meeting')
    .where('meeting.organizerId = :userId', { userId })
    .andWhere('meeting.title LIKE :tag', { tag: `${SEED_TAG}%` })
    .getCount();
  const meetingStatuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];
  for (let i = existingMeetings; i < 15; i += 1) {
    const start = daysFromNow(i - 2, 10 + (i % 6), 0);
    const end = new Date(start.getTime() + 90 * 60 * 1000);
    await meetings.save(
      meetings.create({
        title: `${SEED_TAG} 行政会议 ${numbered(i)} - ${pick(['周例会', '供应商评审', '空间优化讨论', '活动复盘', '预算沟通'], i)}`,
        agenda: '1. 当前事项进展；2. 风险与资源协调；3. 后续行动项确认。',
        startTime: start,
        endTime: end,
        location: pick(locations, i + 1),
        meetingLink: i % 3 === 0 ? 'https://meeting.example.com/opc-demo' : undefined,
        participants: ['行政部', '财务部', 'IT支持', pick(['业务一部', '业务二部', '法务部'], i)],
        minutes: i % 3 === 1 ? '会议已确认责任人和截止时间，待下次例会复盘。' : undefined,
        status: pick(meetingStatuses, i),
        organizerId: userId,
      }),
    );
  }
}

seed().catch(async (error) => {
  console.error(error);
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exitCode = 1;
});
