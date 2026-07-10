import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RagService } from "../../../ai/rag/rag.service";
import { Knowledge } from "../../../modules/knowledge/entities/knowledge.entity";
import {
  KnowledgeChunk,
  KnowledgeChunkVectorStatus,
} from "../entities/knowledge-chunk.entity";

export interface KnowledgeSearchResult {
  id: string;
  title: string;
  content: string;
  category: string;
  relevanceScore: number;
}

@Injectable()
export class KnowledgeVectorService {
  private readonly logger = new Logger(KnowledgeVectorService.name);

  constructor(
    @InjectRepository(KnowledgeChunk)
    private readonly chunks: Repository<KnowledgeChunk>,
    @InjectRepository(Knowledge)
    private readonly knowledge: Repository<Knowledge>,
    private readonly rag: RagService,
  ) {}

  async ingestKnowledge(knowledgeId: string): Promise<KnowledgeChunk[]> {
    const item = await this.knowledge.findOne({ where: { id: knowledgeId } });
    if (!item) return [];

    await this.chunks.delete({ knowledgeId });
    const chunks = this.chunkText(item.content).map((content, index) =>
      this.chunks.create({
        knowledgeId,
        chunkIndex: index,
        content,
        tokenCount: this.estimateTokenCount(content),
        embedding: null,
        vectorStatus: KnowledgeChunkVectorStatus.PENDING,
        metadata: { title: item.title, category: item.category },
      }),
    );
    return this.chunks.save(chunks);
  }

  async search(query: string, topK = 5): Promise<KnowledgeSearchResult[]> {
    try {
      const keywordResults = await this.searchChunksByKeyword(query, topK);
      if (keywordResults.length > 0) return keywordResults;
    } catch (error) {
      this.logger.warn(
        `Chunk search failed, fallback to RAG: ${String(error)}`,
      );
    }

    const fallback = await this.rag.retrieve(query, topK);
    return fallback.documents;
  }

  private async searchChunksByKeyword(
    query: string,
    topK: number,
  ): Promise<KnowledgeSearchResult[]> {
    const keywords = query
      .split(/[\s,，。.、]+/)
      .filter((word) => word.length > 1)
      .slice(0, 8);
    if (keywords.length === 0) return [];

    const builder = this.chunks
      .createQueryBuilder("chunk")
      .innerJoin(Knowledge, "knowledge", "knowledge.id = chunk.knowledge_id")
      .select([
        "chunk.id AS id",
        "chunk.content AS content",
        "knowledge.title AS title",
        "knowledge.category AS category",
      ]);

    builder.where(
      keywords
        .map(
          (_, index) =>
            `(chunk.content LIKE :kw${index} OR knowledge.title LIKE :kw${index})`,
        )
        .join(" OR "),
    );
    keywords.forEach((keyword, index) =>
      builder.setParameter(`kw${index}`, `%${keyword}%`),
    );
    builder.limit(topK);

    const rows = await builder.getRawMany<{
      id: string;
      title: string;
      content: string;
      category: string;
    }>();

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content.slice(0, 1200),
      category: row.category,
      relevanceScore: this.score(query, row.title, row.content),
    }));
  }

  private chunkText(content: string): string[] {
    const normalized = content.trim();
    if (!normalized) return [];
    const size = 1000;
    const overlap = 150;
    const chunks: string[] = [];
    for (let start = 0; start < normalized.length; start += size - overlap) {
      chunks.push(normalized.slice(start, start + size));
    }
    return chunks;
  }

  private estimateTokenCount(content: string): number {
    return Math.ceil(content.length / 2);
  }

  private score(query: string, title: string, content: string): number {
    const lowerQuery = query.toLowerCase();
    let score = title.toLowerCase().includes(lowerQuery) ? 10 : 0;
    for (const keyword of lowerQuery.split(/[\s,，。.、]+/)) {
      if (keyword.length <= 1) continue;
      if (title.toLowerCase().includes(keyword)) score += 5;
      if (content.toLowerCase().includes(keyword)) score += 2;
    }
    return score;
  }
}
