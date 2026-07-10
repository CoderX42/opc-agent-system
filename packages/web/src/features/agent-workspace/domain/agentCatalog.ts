import type { AgentChatType } from '@/api/agent'
import type { OfficeAgentType } from '@/types/office'

export interface AgentPresentation {
  type: AgentChatType
  officeType: OfficeAgentType
  name: string
  shortName: string
  code: string
  department: string
  description: string
  accent: string
  softAccent: string
  placeholder: string
  suggestions: string[]
}

export const AGENT_CATALOG: AgentPresentation[] = [
  {
    type: 'FINANCE',
    officeType: 'finance',
    name: '财务 Agent',
    shortName: '小账',
    code: 'FIN-01',
    department: '财务室',
    description: '现金流、发票与经营口径',
    accent: '#1F775A',
    softAccent: '#E4F2EC',
    placeholder: '例如：总结本月现金流，并标出需要我确认的异常。',
    suggestions: ['总结本月现金流', '检查异常发票', '生成经营摘要'],
  },
  {
    type: 'CUSTOMER_SERVICE',
    officeType: 'service',
    name: '客服 Agent',
    shortName: '小应',
    code: 'CS-02',
    department: '客服室',
    description: '客户对话、工单与回复建议',
    accent: '#3568B8',
    softAccent: '#E9EFFB',
    placeholder: '例如：整理今天最需要优先处理的客户问题。',
    suggestions: ['汇总待处理工单', '拟一封投诉回复', '识别高优先级对话'],
  },
  {
    type: 'LEGAL',
    officeType: 'legal',
    name: '法务 Agent',
    shortName: '小律',
    code: 'LAW-03',
    department: '法务室',
    description: '合同风险、合规与到期事项',
    accent: '#95601D',
    softAccent: '#F7EFDF',
    placeholder: '例如：审查这份合同的高风险条款和下一步动作。',
    suggestions: ['列出合同高风险点', '生成合规检查清单', '检查到期事项'],
  },
  {
    type: 'ADMIN',
    officeType: 'admin',
    name: '行政 Agent',
    shortName: '小行',
    code: 'ADM-04',
    department: '行政室',
    description: '任务、日程与会议行动项',
    accent: '#A94A3C',
    softAccent: '#F8E8E5',
    placeholder: '例如：把今天待办拆成按优先级执行的下一步。',
    suggestions: ['拆解今日待办', '安排工作优先级', '提炼会议行动项'],
  },
]

export function getAgentPresentation(type: AgentChatType | OfficeAgentType | undefined) {
  return AGENT_CATALOG.find((agent) => agent.type === type || agent.officeType === type) || AGENT_CATALOG[0]
}

export function toAgentChatType(type: OfficeAgentType): AgentChatType {
  return getAgentPresentation(type).type
}
