import { ChatMessage } from '../providers/ai-provider.interface';

export const LEGAL_SYSTEM_PROMPT = `你是一个专业的法务合规助手，专门帮助用户处理以下法律相关事务：

1. 合同审查 - 审查合同条款，识别潜在风险
2. 合规检查 - 检查业务操作是否符合相关法律法规
3. 法律咨询 - 提供基础的法律建议和参考
4. 合同起草 - 协助起草合同文本
5. 风险评估 - 评估业务活动的法律风险

重要声明：
- 你的回答仅供参考，不构成正式的法律意见
- 对于重要的法律事务，建议用户咨询专业律师
- 在提供法律建议时，请注明相关法律依据
- 如果涉及跨境法律问题，请提醒用户注意管辖权问题`;

export function buildLegalMessages(
  userMessage: string,
  context?: {
    contractType?: string;
    industry?: string;
    jurisdiction?: string;
  },
): ChatMessage[] {
  const messages: ChatMessage[] = [
    { role: 'system', content: LEGAL_SYSTEM_PROMPT },
  ];

  if (context?.contractType) {
    messages.push({
      role: 'system',
      content: `合同类型：${context.contractType}`,
    });
  }

  if (context?.industry) {
    messages.push({
      role: 'system',
      content: `所属行业：${context.industry}`,
    });
  }

  if (context?.jurisdiction) {
    messages.push({
      role: 'system',
      content: `适用司法管辖区：${context.jurisdiction}`,
    });
  }

  messages.push({ role: 'user', content: userMessage });

  return messages;
}

export const CONTRACT_REVIEW_PROMPT = `请仔细审查以下合同内容，从以下维度进行分析：

1. 合同主体 - 双方主体是否明确
2. 权利义务 - 双方权利义务是否对等
3. 违约责任 - 违约条款是否完善
4. 争议解决 - 争议解决方式是否合理
5. 知识产权 - 知识产权归属是否明确
6. 保密条款 - 保密义务是否充分
7. 期限终止 - 合同期限和终止条件是否合理
8. 风险条款 - 是否存在不合理风险条款

请以结构化格式返回审查结果，包括：
- 风险等级（低/中/高）
- 发现的问题列表
- 修改建议
- 总体评价

合同内容：`;

export const COMPLIANCE_CHECK_PROMPT = `请根据中国相关法律法规，检查以下业务场景是否存在合规风险：

检查维度：
1. 数据隐私保护（个人信息保护法）
2. 消费者权益保护
3. 广告合规
4. 税务合规
5. 劳动法合规
6. 行业特殊规定

请返回 JSON 格式的检查结果：
{
  "riskLevel": "low/medium/high",
  "items": [
    {
      "dimension": "检查维度",
      "status": "compliant/non_compliant/needs_attention",
      "description": "具体说明",
      "suggestion": "改进建议"
    }
  ],
  "summary": "总体合规评估"
}

业务场景描述：`;
