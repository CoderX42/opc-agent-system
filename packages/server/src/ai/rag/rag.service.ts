import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Knowledge } from '../../modules/knowledge/entities/knowledge.entity';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    @InjectRepository(Knowledge)
    private readonly knowledgeRepository: Repository<Knowledge>,
  ) {}

  /**
   * 根据查询内容检索相关知识
   */
  async retrieve(query: string, topK = 5): Promise<{
    documents: {
      id: string;
      title: string;
      content: string;
      category: string;
      relevanceScore: number;
    }[];
  }> {
    try {
      // 基于关键词的简单检索（实际项目中应使用向量数据库）
      const keywords = query
        .split(/[\s,，。.、]+/)
        .filter((word) => word.length > 1);

      if (keywords.length === 0) {
        return { documents: [] };
      }

      const queryBuilder = this.knowledgeRepository
        .createQueryBuilder('knowledge')
        .where('knowledge.status = :status', { status: 'PUBLISHED' });

      // 为每个关键词构建 OR 条件
      const conditions = keywords.map((_, index) => {
        return `(knowledge.title ILIKE :kw${index} OR knowledge.content ILIKE :kw${index})`;
      });
      queryBuilder.andWhere(`(${conditions.join(' OR ')})`);

      const params: Record<string, string> = {};
      keywords.forEach((keyword, index) => {
        params[`kw${index}`] = `%${keyword}%`;
      });

      queryBuilder.setParameters(params);

      queryBuilder
        .orderBy('knowledge.viewCount', 'DESC')
        .limit(Math.min(100, Math.max(topK * 5, topK)));

      const results = await queryBuilder.getMany();

      const documents = results.map((doc) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content.substring(0, 1000), // 截取前1000字符
        category: doc.category,
        relevanceScore: this.calculateRelevanceScore(query, doc),
      }));

      // 按相关性排序
      documents.sort((a, b) => b.relevanceScore - a.relevanceScore);

      return { documents };
    } catch (error) {
      this.logger.error(`RAG retrieval error: ${error.message}`);
      return { documents: [] };
    }
  }

  /**
   * 构建带上下文的 Prompt
   */
  buildContextPrompt(
    originalQuery: string,
    documents: { title: string; content: string }[],
  ): string {
    if (documents.length === 0) {
      return originalQuery;
    }

    const context = documents
      .map(
        (doc, index) =>
          `[参考资料 ${index + 1}] 标题: ${doc.title}\n内容: ${doc.content}`,
      )
      .join('\n\n');

    return `基于以下参考资料回答用户的问题。如果参考资料中没有相关信息，请根据你的知识进行回答，并说明哪些内容不是来自参考资料。

参考资料：
${context}

用户问题：${originalQuery}`;
  }

  /**
   * 计算简单的相关性分数
   */
  private calculateRelevanceScore(
    query: string,
    document: Knowledge,
  ): number {
    let score = 0;
    const queryLower = query.toLowerCase();
    const titleLower = document.title.toLowerCase();
    const contentLower = document.content.toLowerCase();

    // 标题匹配权重更高
    if (titleLower.includes(queryLower)) {
      score += 10;
    }

    // 关键词匹配
    const keywords = queryLower.split(/[\s,，。.、]+/);
    for (const keyword of keywords) {
      if (keyword.length <= 1) continue;
      if (titleLower.includes(keyword)) {
        score += 5;
      }
      if (contentLower.includes(keyword)) {
        score += 2;
      }
    }

    // 热门度加权
    score += Math.min(document.viewCount * 0.01, 2);

    return score;
  }
}
