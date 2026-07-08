你是一名资深 NestJS AI Agent 架构工程师。

当前项目已经完成：

* NestJS + Vue3 Monorepo
* Agent CRUD
* Agent Chat
* 多模型 Provider
* 财务Agent
* 客服Agent
* 法务Agent
* 行政Agent
* 基础RAG
* 知识库
* Agent办公室

请不要重构现有业务代码。

请基于现有架构升级 Agent 系统。

目标：

将当前“AI聊天系统”升级为真正的企业级 Agent Runtime。

====================

第一阶段：

实现 Agent Runtime。

新增模块：

src/core/agent-runtime

包含：

1. AgentExecutor

负责：

* 加载Agent配置
* 加载Prompt
* 获取Memory
* 查询知识库
* 执行Tool
* 调用LLM
* 保存结果

2. Supervisor Agent

实现：

* 用户意图识别
* Agent自动路由
* 多Agent协作

例如：

用户：

分析客户合作风险

自动调用：

CustomerAgent

LegalAgent

FinanceAgent

3. Agent Task系统

新增：

AgentTask实体

字段：

id

agentId

userId

taskType

status

input

plan

result

error

createdAt

状态：

WAITING

PLANNING

RUNNING

TOOL_CALLING

COMPLETED

FAILED

====================

第二阶段：

实现Memory系统。

增加：

1.Redis短期记忆

保存：

* 当前会话
* 上下文

2.PostgreSQL长期记忆

保存：

* 用户习惯
* 企业信息
* 历史决策
* 客户关系

3.pgvector知识记忆

完善：

文件上传

↓

解析

↓

Chunk

↓

Embedding

↓

向量搜索

↓

RAG

====================

第三阶段：

实现Tool Calling。

设计统一接口：

AgentTool

包含：

name

description

execute()

实现：

FinanceTools

* 查询收入
* 查询支出
* 财务分析

CustomerTools

* 查询客户
* 创建工单

LegalTools

* 合同分析
* 风险检测

AdminTools

* 创建任务
* 创建日程

====================

第四阶段：

实现语音助手。

支持：

ASR

Text Agent

TTS

接口：

POST /voice/chat

====================

要求：

保持当前模块化单体架构。

不要拆微服务。

兼容已有Agent。

代码必须符合NestJS最佳实践。

提供：

数据库迁移

Entity

Service

Controller

DTO

测试代码

先输出：

架构设计

数据库设计

模块调整方案

再开始编码。