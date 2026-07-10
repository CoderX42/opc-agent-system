-- OPC Agent System: MySQL 8 初始化脚本
-- 用法：mysql -h <host> -u <user> -p agent-system < init-mysql.sql
-- 注意：本脚本不删除已有数据；种子账号为 admin / Admin123!，上线后请立即修改密码。

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS `users` (
  `id` char(36) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(100) NOT NULL,
  `role` enum('ADMIN','USER') NOT NULL DEFAULT 'USER',
  `avatar` varchar(500) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE','BANNED') NOT NULL DEFAULT 'ACTIVE',
  `refresh_token_hash` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_users_username` (`username`),
  UNIQUE KEY `UQ_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `agents` (
  `id` char(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('FINANCE','CUSTOMER_SERVICE','LEGAL','ADMIN') NOT NULL,
  `status` enum('ACTIVE','INACTIVE','MAINTENANCE') NOT NULL DEFAULT 'ACTIVE',
  `config` text DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `knowledge` (
  `id` char(36) NOT NULL,
  `title` varchar(200) NOT NULL,
  `content` text NOT NULL,
  `category` varchar(50) NOT NULL,
  `tags` text DEFAULT NULL,
  `summary` text DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'PUBLISHED',
  `authorId` char(36) DEFAULT NULL,
  `viewCount` int NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `invoices` (
  `id` char(36) NOT NULL,
  `invoiceNo` varchar(50) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `type` varchar(50) NOT NULL,
  `category` varchar(50) NOT NULL,
  `date` date NOT NULL,
  `vendor` varchar(200) DEFAULT NULL,
  `customerName` varchar(200) DEFAULT NULL,
  `taxRate` decimal(5,2) NOT NULL DEFAULT 0,
  `taxAmount` decimal(12,2) NOT NULL DEFAULT 0,
  `dueDate` date DEFAULT NULL,
  `description` text DEFAULT NULL,
  `imageUrl` varchar(500) DEFAULT NULL,
  `attachments` text DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `owner_id` char(36) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_invoices_invoiceNo` (`invoiceNo`),
  KEY `IDX_invoices_owner_status_created` (`owner_id`,`status`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `transactions` (
  `id` char(36) NOT NULL,
  `type` enum('INCOME','EXPENSE') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `category` varchar(50) NOT NULL,
  `date` date NOT NULL,
  `description` text DEFAULT NULL,
  `account` varchar(100) DEFAULT NULL,
  `counterparty` varchar(200) DEFAULT NULL,
  `attachments` text DEFAULT NULL,
  `invoice_id` char(36) DEFAULT NULL,
  `owner_id` char(36) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_transactions_owner_type_created` (`owner_id`,`type`,`created_at`),
  CONSTRAINT `FK_transactions_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `accounts` (
  `id` char(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL,
  `balance` decimal(12,2) NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `owner_id` char(36) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_accounts_owner_status` (`owner_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `conversations` (
  `id` char(36) NOT NULL,
  `channel` enum('WEB','EMAIL','PHONE','WECHAT') NOT NULL,
  `customerName` varchar(100) NOT NULL,
  `status` enum('ACTIVE','CLOSED','PENDING') NOT NULL DEFAULT 'ACTIVE',
  `summary` text DEFAULT NULL,
  `owner_id` char(36) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_conversations_owner_status_updated` (`owner_id`,`status`,`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tickets` (
  `id` char(36) NOT NULL,
  `title` varchar(200) NOT NULL,
  `content` text NOT NULL,
  `priority` enum('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
  `status` enum('OPEN','IN_PROGRESS','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
  `assignedTo` varchar(100) DEFAULT NULL,
  `resolution` text DEFAULT NULL,
  `resolvedAt` datetime DEFAULT NULL,
  `conversation_id` char(36) DEFAULT NULL,
  `owner_id` char(36) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_tickets_owner_status_created` (`owner_id`,`status`,`created_at`),
  CONSTRAINT `FK_tickets_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `conversation_messages` (
  `id` char(36) NOT NULL,
  `conversation_id` char(36) NOT NULL,
  `role` varchar(20) NOT NULL,
  `content` text NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_conversation_messages_conversation_created` (`conversation_id`,`created_at`),
  CONSTRAINT `FK_messages_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `contracts` (
  `id` char(36) NOT NULL,
  `title` varchar(200) NOT NULL,
  `type` enum('SALES','PURCHASE','SERVICE','NDA','EMPLOYMENT','OTHER') NOT NULL,
  `content` text NOT NULL,
  `status` enum('DRAFT','REVIEWING','APPROVED','REJECTED','SIGNED','EXPIRED') NOT NULL DEFAULT 'DRAFT',
  `reviewResult` text DEFAULT NULL,
  `amount` decimal(12,2) DEFAULT NULL,
  `partyA` varchar(100) DEFAULT NULL,
  `partyB` varchar(100) DEFAULT NULL,
  `signDate` date DEFAULT NULL,
  `expiryDate` date DEFAULT NULL,
  `owner_id` char(36) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_contracts_owner_status_updated` (`owner_id`,`status`,`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `compliance_records` (
  `id` char(36) NOT NULL,
  `title` varchar(200) NOT NULL,
  `category` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `dueDate` date DEFAULT NULL,
  `responsiblePerson` varchar(100) DEFAULT NULL,
  `result` text DEFAULT NULL,
  `owner_id` char(36) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_compliance_owner_status_created` (`owner_id`,`status`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tasks` (
  `id` char(36) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `priority` enum('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'MEDIUM',
  `status` enum('TODO','IN_PROGRESS','DONE') NOT NULL DEFAULT 'TODO',
  `due_date` date DEFAULT NULL,
  `assigneeId` char(36) DEFAULT NULL,
  `creatorId` char(36) DEFAULT NULL,
  `parent_task_id` char(36) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `schedules` (
  `id` char(36) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `startTime` datetime NOT NULL,
  `endTime` datetime DEFAULT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'PERSONAL',
  `location` varchar(100) DEFAULT NULL,
  `userId` char(36) DEFAULT NULL,
  `isAllDay` tinyint NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `meetings` (
  `id` char(36) NOT NULL,
  `title` varchar(200) NOT NULL,
  `agenda` text DEFAULT NULL,
  `startTime` datetime NOT NULL,
  `endTime` datetime DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `meetingLink` varchar(50) DEFAULT NULL,
  `participants` text DEFAULT NULL,
  `minutes` text DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'SCHEDULED',
  `organizerId` char(36) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `agent_tasks` (
  `id` char(36) NOT NULL,
  `agent_id` char(36) DEFAULT NULL,
  `user_id` char(36) NOT NULL,
  `task_type` varchar(80) NOT NULL,
  `status` enum('WAITING','PLANNING','RUNNING','TOOL_CALLING','COMPLETED','FAILED') NOT NULL DEFAULT 'WAITING',
  `agent_type` enum('FINANCE','CUSTOMER_SERVICE','LEGAL','ADMIN') DEFAULT NULL,
  `input` text NOT NULL,
  `plan` text DEFAULT NULL,
  `result` text DEFAULT NULL,
  `error` text DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_agent_tasks_user_status` (`user_id`,`status`),
  KEY `IDX_agent_tasks_agent_created` (`agent_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `agent_memories` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `agent_id` char(36) DEFAULT NULL,
  `memory_type` enum('USER_PREFERENCE','ENTERPRISE_INFO','HISTORICAL_DECISION','CUSTOMER_RELATIONSHIP','CONVERSATION_SUMMARY') NOT NULL,
  `scope` varchar(80) NOT NULL DEFAULT 'default',
  `key` varchar(160) NOT NULL,
  `content` text NOT NULL,
  `metadata` text DEFAULT NULL,
  `importance` int NOT NULL DEFAULT 1,
  `last_accessed_at` datetime DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_agent_memories_identity` (`user_id`,`agent_id`,`memory_type`,`scope`,`key`),
  KEY `IDX_agent_memories_user_type` (`user_id`,`memory_type`),
  KEY `IDX_agent_memories_agent_scope` (`agent_id`,`scope`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `knowledge_chunks` (
  `id` char(36) NOT NULL,
  `knowledge_id` char(36) NOT NULL,
  `chunk_index` int NOT NULL,
  `content` text NOT NULL,
  `token_count` int NOT NULL DEFAULT 0,
  `embedding` text DEFAULT NULL,
  `vector_status` enum('PENDING','READY','FAILED') NOT NULL DEFAULT 'PENDING',
  `metadata` text DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_knowledge_chunks_knowledge_index` (`knowledge_id`,`chunk_index`),
  KEY `IDX_knowledge_chunks_vector_status` (`vector_status`),
  KEY `IDX_knowledge_chunks_knowledge` (`knowledge_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 使 TypeORM 将此库识别为已完成 MySQL 基线迁移。
CREATE TABLE IF NOT EXISTS `migrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timestamp` bigint NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `migrations` (`timestamp`, `name`)
SELECT 1782012302853, 'InitialMySqlSchema1782012302853'
WHERE NOT EXISTS (
  SELECT 1 FROM `migrations` WHERE `name` = 'InitialMySqlSchema1782012302853'
);

-- 最小可用初始化数据。
INSERT INTO `users` (`id`, `username`, `password`, `email`, `role`, `status`)
VALUES ('00000000-0000-4000-8000-000000000001', 'admin', '$2a$12$Na6M5.Ionwm5Zp0StePf3exClvcj732TARJBhq1grcDtB6M9EMaB.', 'admin@opc.local', 'ADMIN', 'ACTIVE')
ON DUPLICATE KEY UPDATE `id` = `id`;

INSERT INTO `agents` (`id`, `name`, `type`, `status`, `config`) VALUES
  ('00000000-0000-4000-8000-000000000011', '财务助理', 'FINANCE', 'ACTIVE', '{}'),
  ('00000000-0000-4000-8000-000000000012', '客服助理', 'CUSTOMER_SERVICE', 'ACTIVE', '{}'),
  ('00000000-0000-4000-8000-000000000013', '法务助理', 'LEGAL', 'ACTIVE', '{}'),
  ('00000000-0000-4000-8000-000000000014', '行政助理', 'ADMIN', 'ACTIVE', '{}')
ON DUPLICATE KEY UPDATE `id` = `id`;

INSERT INTO `knowledge` (`id`, `title`, `content`, `category`, `tags`, `summary`, `status`, `authorId`)
VALUES (
  '00000000-0000-4000-8000-000000000021',
  'OPC 系统使用说明',
  '本系统提供财务、客服、法务和行政四类数字员工能力。关键操作应由用户确认后执行。',
  'SYSTEM',
  '["系统","使用说明"]',
  '系统能力与人工确认原则',
  'PUBLISHED',
  '00000000-0000-4000-8000-000000000001'
)
ON DUPLICATE KEY UPDATE `id` = `id`;
