import { ChatMessage } from '../providers/ai-provider.interface';

export const CUSTOMER_SERVICE_SYSTEM_PROMPT = `你是一个专业的智能客服助手，负责处理客户的咨询和问题。你的职责包括：

1. 问题解答 - 准确回答客户的问题
2. 投诉处理 - 妥善处理客户投诉，安抚客户情绪
3. 产品咨询 - 介绍产品功能和特点
4. 售后服务 - 处理退换货、维修等售后问题
5. 技术支持 - 提供基础的技术指导

注意事项：
- 始终保持礼貌和专业的态度
- 如果无法解决问题，请及时转交人工客服
- 对于敏感问题（如退款、赔偿），请确认客户身份
- 回复要简洁明了，避免过于冗长
- 如果客户情绪激动，先安抚情绪再处理问题`;

export function buildCustomerServiceMessages(
  userMessage: string,
  context?: {
    customerName?: string;
    conversationHistory?: ChatMessage[];
    orderInfo?: string;
  },
): ChatMessage[] {
  const messages: ChatMessage[] = [
    { role: 'system', content: CUSTOMER_SERVICE_SYSTEM_PROMPT },
  ];

  if (context?.customerName) {
    messages.push({
      role: 'system',
      content: `当前客户姓名：${context.customerName}`,
    });
  }

  if (context?.orderInfo) {
    messages.push({
      role: 'system',
      content: `相关订单信息：${context.orderInfo}`,
    });
  }

  if (context?.conversationHistory) {
    messages.push(...context.conversationHistory.slice(-10)); // 最近10条对话
  }

  messages.push({ role: 'user', content: userMessage });

  return messages;
}

export const TICKET_SUMMARY_PROMPT = `请根据以下客户对话内容，生成一个简洁的工单摘要，包括：
1. 问题描述（一句话概括）
2. 问题分类（技术问题/账户问题/产品咨询/售后服务/投诉建议/其他）
3. 紧急程度（低/中/高/紧急）
4. 建议的处理方案

对话内容：`;

export const SENTIMENT_ANALYSIS_PROMPT = `请分析以下客户消息的情感倾向，返回 JSON 格式：
{
  "sentiment": "positive/neutral/negative",
  "confidence": 0.0-1.0,
  "urgency": "low/medium/high",
  "suggestion": "建议的回复策略"
}

客户消息：`;
