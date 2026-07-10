import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Cache } from "cache-manager";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AgentMemory, AgentMemoryType } from "../entities/agent-memory.entity";

export interface RuntimeMemoryContext {
  shortTerm: string[];
  longTerm: AgentMemory[];
}

@Injectable()
export class AgentMemoryService {
  private readonly logger = new Logger(AgentMemoryService.name);

  constructor(
    @InjectRepository(AgentMemory)
    private readonly memories: Repository<AgentMemory>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getContext(input: {
    userId: string;
    agentId?: string;
    sessionId?: string;
    query?: string;
  }): Promise<RuntimeMemoryContext> {
    const [shortTerm, longTerm] = await Promise.all([
      this.getShortTerm(input.userId, input.sessionId),
      this.findLongTerm(input.userId, input.agentId, input.query),
    ]);
    return { shortTerm, longTerm };
  }

  async appendShortTerm(
    userId: string,
    sessionId: string | undefined,
    role: "user" | "assistant" | "tool",
    content: string,
  ): Promise<void> {
    if (!sessionId) return;
    const key = this.shortTermKey(userId, sessionId);
    try {
      const existing = ((await this.cache.get<string[]>(key)) || []).slice(-19);
      existing.push(`${role}: ${content}`);
      await this.cache.set(key, existing, 60 * 60 * 2);
    } catch (error) {
      this.logger.warn(`Short-term memory unavailable: ${String(error)}`);
    }
  }

  async getShortTerm(userId: string, sessionId?: string): Promise<string[]> {
    if (!sessionId) return [];
    try {
      return (
        (await this.cache.get<string[]>(
          this.shortTermKey(userId, sessionId),
        )) || []
      );
    } catch (error) {
      this.logger.warn(`Read short-term memory failed: ${String(error)}`);
      return [];
    }
  }

  async upsertLongTerm(input: {
    userId: string;
    agentId?: string;
    memoryType: AgentMemoryType;
    scope?: string;
    key: string;
    content: string;
    metadata?: Record<string, unknown>;
    importance?: number;
  }): Promise<AgentMemory> {
    const existing = await this.memories
      .createQueryBuilder("memory")
      .where("memory.userId = :userId", { userId: input.userId })
      .andWhere(
        input.agentId ? "memory.agentId = :agentId" : "memory.agentId IS NULL",
        {
          agentId: input.agentId,
        },
      )
      .andWhere("memory.memoryType = :memoryType", {
        memoryType: input.memoryType,
      })
      .andWhere("memory.scope = :scope", { scope: input.scope || "default" })
      .andWhere("memory.key = :key", { key: input.key })
      .getOne();
    const memory = existing || this.memories.create();
    Object.assign(memory, {
      userId: input.userId,
      agentId: input.agentId || null,
      memoryType: input.memoryType,
      scope: input.scope || "default",
      key: input.key,
      content: input.content,
      metadata: input.metadata || null,
      importance: input.importance || 1,
      lastAccessedAt: new Date(),
    });
    return this.memories.save(memory);
  }

  async findLongTerm(
    userId: string,
    agentId?: string,
    query?: string,
  ): Promise<AgentMemory[]> {
    const builder = this.memories
      .createQueryBuilder("memory")
      .where("memory.userId = :userId", { userId })
      .andWhere("(memory.agentId = :agentId OR memory.agentId IS NULL)", {
        agentId: agentId || null,
      });

    if (query) {
      const keywords = query
        .split(/[\s,，。.、]+/)
        .filter((item) => item.length > 1)
        .slice(0, 5);
      if (keywords.length > 0) {
        builder.andWhere(
          keywords
            .map(
              (_, index) =>
                `(memory.key LIKE :kw${index} OR memory.content LIKE :kw${index})`,
            )
            .join(" OR "),
          Object.fromEntries(
            keywords.map((keyword, index) => [`kw${index}`, `%${keyword}%`]),
          ),
        );
      }
    }

    const result = await builder
      .orderBy("memory.importance", "DESC")
      .addOrderBy("memory.updatedAt", "DESC")
      .take(10)
      .getMany();

    if (result.length > 0) {
      await this.memories.update(
        result.map((memory) => memory.id),
        { lastAccessedAt: new Date() },
      );
    }
    return result;
  }

  private shortTermKey(userId: string, sessionId: string): string {
    return `agent:memory:${userId}:${sessionId}`;
  }
}
