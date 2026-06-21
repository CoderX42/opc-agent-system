import { ChatMessage } from '../providers/ai-provider.interface';

export const FINANCE_SYSTEM_PROMPT = `你是一个专业的财务记账助手，专门帮助用户处理以下财务相关事务：

1. 发票识别与管理 - 识别发票信息，自动分类和归档
2. 账务记录 - 记录收入和支出交易
3. 财务报表 - 生成财务摘要和报表
4. 预算分析 - 分析支出趋势，提供预算建议
5. 税务提醒 - 提醒税务相关事项

请以专业、准确的方式回答用户的财务问题。当处理具体金额时，请务必仔细核对。
如果用户提供的财务信息不完整，请主动询问缺失的信息。`;

export function buildFinanceMessages(userMessage: string): ChatMessage[] {
  return [
    { role: 'system', content: FINANCE_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ];
}

export const FINANCE_INVOICE_RECOGNITION_PROMPT = `请分析以下发票信息，提取关键字段并以 JSON 格式返回：
- 金额 (amount)
- 发票类型 (type): 增值税专用发票/增值税普通发票/收据/其他
- 分类 (category): 办公用品/差旅/餐饮/交通/通讯/租金/工资/其他
- 日期 (date)
- 销售方 (vendor)
- 描述 (description)

请只返回 JSON 格式的结果，不要包含其他文字。`;

export const FINANCE_CATEGORIZATION_PROMPT = `请根据以下交易描述，将其归类到合适的财务分类中。
可选分类：办公用品、差旅、餐饮、交通、通讯、租金、工资、水电、维修、营销、培训、税费、其他。

交易描述：`;
