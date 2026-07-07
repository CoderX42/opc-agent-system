import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent, AgentStatus, AgentType } from '../agent/entities/agent.entity';

export type OfficeAgentStatus =
  | 'running'
  | 'waiting'
  | 'error'
  | 'idle'
  | 'paused'
  | 'completed';

export type OfficeAgentType = 'finance' | 'service' | 'legal' | 'admin';
export type OfficeAgentLogType = 'system' | 'task' | 'tool' | 'command' | 'error';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface OfficeAgentLog {
  id: string;
  time: string;
  type: OfficeAgentLogType;
  content: string;
}

export interface OfficeAgent {
  id: string;
  type: OfficeAgentType;
  name: string;
  shortName: string;
  department: string;
  roleDescription: string;
  status: OfficeAgentStatus;
  previousStatus?: OfficeAgentStatus;
  currentTask: string;
  progress: number;
  completedToday: number;
  pendingItems: number;
  inputData: string[];
  outputResults: string[];
  accent: string;
  roomName: string;
  logs: OfficeAgentLog[];
}

export interface OfficeTask {
  id: string;
  agentId: string;
  name: string;
  priority: TaskPriority;
  status: OfficeAgentStatus;
  progress: number;
  updatedAt: string;
  assignee?: string;
  duration?: string;
  businessPath?: string;
}

export interface OfficeStats {
  completedToday: number;
  running: number;
  waiting: number;
  errors: number;
  savedHours: string;
  savedCost: string;
}

export interface OfficeStateResponse {
  agents: OfficeAgent[];
  tasks: OfficeTask[];
  stats: OfficeStats;
}

interface PersonaProfile {
  type: OfficeAgentType;
  shortName: string;
  department: string;
  roomCode: string;
  roleDescription: string;
  accent: string;
  currentTask: string;
  inputData: string[];
  outputResults: string[];
  defaultLogs: Array<{ type: OfficeAgentLogType; content: string; minutesAgo: number }>;
}

const PERSONAS: Record<AgentType, PersonaProfile> = {
  [AgentType.FINANCE]: {
    type: 'finance',
    shortName: '小账',
    department: '财务室',
    roomCode: 'FIN-01',
    roleDescription: '负责账务核算、发票归集、利润分析与报税资料准备。',
    accent: '#4B8FCB',
    currentTask: '正在核算本月现金流',
    inputData: ['本月银行流水 168 条', '待核验发票 24 张', '成本中心预算表'],
    outputResults: ['现金流分析草稿', '异常支出 3 项', '利润预测 +8.4%'],
    defaultLogs: [
      { type: 'tool', content: '调用 cashflow_reporter 汇总银行流水', minutesAgo: 1 },
      { type: 'task', content: '现金流核算进度更新至 72%', minutesAgo: 4 },
      { type: 'tool', content: '完成 24 张发票字段校验', minutesAgo: 8 },
      { type: 'system', content: '经营数据快照已同步', minutesAgo: 12 },
      { type: 'task', content: '开始生成本月利润分析报告', minutesAgo: 18 },
    ],
  },
  [AgentType.CUSTOMER_SERVICE]: {
    type: 'service',
    shortName: '小应',
    department: '客服室',
    roomCode: 'CUS-02',
    roleDescription: '负责客户邮件、工单分类、售后回复与升级问题跟踪。',
    accent: '#D9A441',
    currentTask: '正在回复售后邮件',
    inputData: ['售后邮件 12 封', '客户历史会话', '赔付政策知识库'],
    outputResults: ['回复草稿 9 封', '需人工确认 3 封', '高风险客户 1 位'],
    defaultLogs: [
      { type: 'task', content: '3 封赔付邮件等待人工确认', minutesAgo: 2 },
      { type: 'tool', content: '调用 reply_drafter 生成回复草稿', minutesAgo: 5 },
      { type: 'system', content: '客户情绪标签已刷新', minutesAgo: 9 },
      { type: 'task', content: '售后邮件处理进度更新至 58%', minutesAgo: 14 },
      { type: 'tool', content: '完成工单优先级分类', minutesAgo: 21 },
    ],
  },
  [AgentType.LEGAL]: {
    type: 'legal',
    shortName: '小律',
    department: '法务室',
    roomCode: 'LAW-03',
    roleDescription: '负责合同条款审查、合规扫描、风险标注与法律文本起草。',
    accent: '#D66B52',
    currentTask: '正在审查租赁合同',
    inputData: ['屋顶光伏租赁合同', '公司合同模板', '风险审查规则 42 条'],
    outputResults: ['高风险条款 2 项', '待确认责任边界', '合同修改建议草稿'],
    defaultLogs: [
      { type: 'error', content: '第 8 条责任边界存在歧义，任务已挂起', minutesAgo: 1 },
      { type: 'tool', content: '风险扫描命中 2 项高风险条款', minutesAgo: 6 },
      { type: 'task', content: '合同审查进度更新至 41%', minutesAgo: 11 },
      { type: 'system', content: '已载入租赁合同审查规则', minutesAgo: 17 },
      { type: 'task', content: '开始审查屋顶光伏租赁合同', minutesAgo: 25 },
    ],
  },
  [AgentType.ADMIN]: {
    type: 'admin',
    shortName: '小行',
    department: '行政室',
    roomCode: 'ADM-04',
    roleDescription: '负责日程同步、会议纪要、待办整理与内部文件流转。',
    accent: '#4F8F68',
    currentTask: '正在整理本周待办',
    inputData: ['本周会议日历', '会议录音转写', '部门待办清单'],
    outputResults: ['会议纪要 4 份', '待办事项 11 条', '日程冲突 0 项'],
    defaultLogs: [
      { type: 'task', content: '本周待办整理完成', minutesAgo: 3 },
      { type: 'tool', content: '调用 calendar_sync 校验日程冲突', minutesAgo: 7 },
      { type: 'task', content: '生成 4 份会议纪要', minutesAgo: 13 },
      { type: 'system', content: '部门待办清单已同步', minutesAgo: 20 },
      { type: 'task', content: '开始整理本周会议材料', minutesAgo: 28 },
    ],
  },
};

function formatTime(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapAgentStatus(status: AgentStatus): OfficeAgentStatus {
  switch (status) {
    case AgentStatus.ACTIVE:
      return 'running';
    case AgentStatus.INACTIVE:
      return 'idle';
    case AgentStatus.MAINTENANCE:
      return 'error';
    default:
      return 'idle';
  }
}

function deriveProgress(status: OfficeAgentStatus): number {
  switch (status) {
    case 'running':
      return 72;
    case 'waiting':
      return 58;
    case 'error':
      return 41;
    case 'completed':
      return 100;
    case 'paused':
      return 30;
    case 'idle':
    default:
      return 100;
  }
}

function buildLogs(profile: PersonaProfile, status: OfficeAgentStatus): OfficeAgentLog[] {
  // 维护态 / 错误态优先展示错误日志
  const baseLogs = status === 'error'
    ? profile.defaultLogs.filter((log) => log.type === 'error' || log.type === 'tool' || log.type === 'task')
    : profile.defaultLogs;
  return baseLogs.map((log, idx) => ({
    id: `${profile.type}-${idx + 1}`,
    time: formatTime(log.minutesAgo),
    type: log.type,
    content: log.content,
  }));
}

function buildAgent(agent: Agent): OfficeAgent {
  const profile = PERSONAS[agent.type];
  const status = mapAgentStatus(agent.status);
  return {
    id: `${profile.type}-agent`,
    type: profile.type,
    name: `${profile.department.replace('室', '')} Agent · ${profile.shortName}`,
    shortName: profile.shortName,
    department: profile.department,
    roleDescription: profile.roleDescription,
    status,
    currentTask: profile.currentTask,
    progress: deriveProgress(status),
    completedToday: status === 'error' ? 3 : status === 'idle' ? 4 : 6,
    pendingItems: status === 'idle' ? 2 : status === 'error' ? 4 : 3,
    inputData: profile.inputData,
    outputResults: profile.outputResults,
    accent: profile.accent,
    roomName: `${profile.department} ${profile.roomCode}`,
    logs: buildLogs(profile, status),
  };
}

@Injectable()
export class OfficeService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
  ) {}

  async getState(): Promise<OfficeStateResponse> {
    const agents = await this.agentRepository.find();
    const byType = new Map<AgentType, Agent>();
    for (const agent of agents) {
      // 每个 type 取最早创建的一条作为该 type 的代表
      const existing = byType.get(agent.type);
      if (!existing || existing.createdAt > agent.createdAt) {
        byType.set(agent.type, agent);
      }
    }

    // 兜底：若某 type 还没有 Agent，则给一个默认 placeholder
    const ensured = Object.values(AgentType).map((type) =>
      byType.get(type) ?? this.placeholderAgent(type),
    );

    const officeAgents = ensured.map(buildAgent);

    const tasks = this.buildTasks(officeAgents);
    const stats = this.buildStats(officeAgents);
    return { agents: officeAgents, tasks, stats };
  }

  private placeholderAgent(type: AgentType): Agent {
    return {
      id: `placeholder-${type}`,
      name: '',
      type,
      status: AgentStatus.ACTIVE,
      config: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Agent;
  }

  private buildTasks(agents: OfficeAgent[]): OfficeTask[] {
    const now = Date.now();
    const ts = (offsetMinutes: number) =>
      new Date(now - offsetMinutes * 60_000).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    const map: Record<OfficeAgentType, OfficeTask[]> = {
      finance: [
        { id: 'task-1', agentId: 'finance-agent', name: '生成本月利润分析报告', priority: 'high', status: 'running', progress: 72, updatedAt: ts(2), assignee: '小账', duration: '2h 10m', businessPath: '/finance/report' },
        { id: 'task-5', agentId: 'finance-agent', name: '生成报税资料清单', priority: 'medium', status: 'running', progress: 35, updatedAt: ts(10), assignee: '小账', duration: '55m', businessPath: '/finance/transaction' },
      ],
      service: [
        { id: 'task-2', agentId: 'service-agent', name: '回复 12 封售后邮件', priority: 'high', status: 'waiting', progress: 58, updatedAt: ts(3), assignee: '小应', duration: '1h 45m', businessPath: '/customer-service/ticket' },
        { id: 'task-6', agentId: 'service-agent', name: '起草客户赔付说明', priority: 'medium', status: 'waiting', progress: 64, updatedAt: ts(12), assignee: '小应', duration: '1h 10m', businessPath: '/customer-service/conversation' },
      ],
      legal: [
        { id: 'task-3', agentId: 'legal-agent', name: '审查屋顶光伏租赁合同', priority: 'high', status: 'error', progress: 41, updatedAt: ts(1), assignee: '小律', duration: '3h 05m', businessPath: '/legal/contract' },
      ],
      admin: [
        { id: 'task-4', agentId: 'admin-agent', name: '整理本周会议纪要', priority: 'medium', status: 'completed', progress: 100, updatedAt: ts(8), assignee: '小行', duration: '40m', businessPath: '/admin/meeting' },
      ],
    };
    return agents.flatMap((agent) => map[agent.type] ?? []);
  }

  private buildStats(agents: OfficeAgent[]): OfficeStats {
    const running = agents.filter((a) => a.status === 'running').length;
    const waiting = agents.filter((a) => a.status === 'waiting').length;
    const errors = agents.filter((a) => a.status === 'error').length;
    const completedToday = agents.reduce((sum, a) => sum + (a.completedToday ?? 0), 0);
    return {
      completedToday,
      running,
      waiting,
      errors,
      savedHours: '7.5h',
      savedCost: '¥3,860',
    };
  }
}