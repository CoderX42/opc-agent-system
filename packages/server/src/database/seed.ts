import { hash } from 'bcryptjs';
import AppDataSource from './data-source';
import { Agent, AgentStatus, AgentType } from '../modules/agent/entities/agent.entity';
import { Knowledge } from '../modules/knowledge/entities/knowledge.entity';
import { User, UserRole, UserStatus } from '../modules/user/entities/user.entity';

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

  await AppDataSource.destroy();
  console.log(`Seed complete: admin=${username}, agents=${agentSeeds.length}`);
}

seed().catch(async (error) => {
  console.error(error);
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exitCode = 1;
});
