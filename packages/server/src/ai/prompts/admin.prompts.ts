import { ChatMessage } from '../providers/ai-provider.interface';

export const ADMIN_SYSTEM_PROMPT = `你是一个专业的行政办公助手，专门帮助用户处理以下行政事务：

1. 日程管理 - 安排和管理日程、会议
2. 任务管理 - 创建、分配和跟踪任务
3. 会议纪要 - 生成会议纪要和行动项
4. 文档处理 - 协助处理各类办公文档
5. 流程优化 - 提供办公流程优化建议
6. 通知提醒 - 管理各类通知和提醒

请以高效、有条理的方式帮助用户处理行政事务。`;

export function buildAdminMessages(userMessage: string): ChatMessage[] {
  return [
    { role: 'system', content: ADMIN_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ];
}

export const MEETING_MINUTES_PROMPT = `请根据以下会议内容，生成结构化的会议纪要，包括：

1. 会议基本信息
   - 会议主题
   - 参会人员
   - 会议时间

2. 讨论要点
   - 每个议题的讨论摘要
   - 主要观点和建议

3. 决议事项
   - 已达成的决议
   - 待决定的事项

4. 行动项（Action Items）
   - 任务描述
   - 负责人
   - 截止日期
   - 优先级

5. 下次会议安排
   - 计划时间
   - 议题预告

会议内容：`;

export const TASK_PRIORITIZATION_PROMPT = `请根据以下任务列表，帮助进行优先级排序和资源分配建议。

考虑因素：
- 任务紧急程度（截止日期）
- 任务重要程度（对业务的影响）
- 任务依赖关系
- 资源可用性

请返回 JSON 格式的排序结果：
{
  "prioritizedTasks": [
    {
      "task": "任务名称",
      "priority": "high/medium/low",
      "reason": "排序理由",
      "suggestedAssignee": "建议负责人",
      "estimatedTime": "预计耗时"
    }
  ],
  "schedule": "建议的执行时间表",
  "risks": ["潜在风险"]
}

任务列表：`;

export const SCHEDULE_OPTIMIZATION_PROMPT = `请根据以下日程安排，提供优化建议：

1. 时间冲突检测 - 检查是否有时间冲突
2. 合并建议 - 是否有可以合并的会议
3. 时间块优化 - 建议最佳的时间分配
4. 休息时间 - 确保有足够的休息间隔
5. 优先级调整 - 根据重要性调整顺序

当前日程：`;
