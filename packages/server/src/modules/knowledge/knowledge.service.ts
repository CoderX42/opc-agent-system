import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Knowledge } from './entities/knowledge.entity';

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(Knowledge)
    private readonly knowledgeRepository: Repository<Knowledge>,
  ) {}

  async create(data: Partial<Knowledge>): Promise<Knowledge> {
    const knowledge = this.knowledgeRepository.create(data);
    return this.knowledgeRepository.save(knowledge);
  }

  async findAll(
    page = 1,
    limit = 10,
    category?: string,
    keyword?: string,
  ): Promise<{ items: Knowledge[]; total: number }> {
    const queryBuilder = this.knowledgeRepository.createQueryBuilder('knowledge');

    if (category) {
      queryBuilder.andWhere('knowledge.category = :category', { category });
    }

    if (keyword) {
      queryBuilder.andWhere(
        '(knowledge.title LIKE :keyword OR knowledge.content LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    queryBuilder
      .orderBy('knowledge.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    return { items, total };
  }

  async findOne(id: string): Promise<Knowledge> {
    const knowledge = await this.knowledgeRepository.findOne({ where: { id } });
    if (!knowledge) {
      throw new NotFoundException(`Knowledge #${id} not found`);
    }

    // 增加浏览计数
    await this.knowledgeRepository.increment({ id }, 'viewCount', 1);
    knowledge.viewCount += 1;

    return knowledge;
  }

  async update(id: string, data: Partial<Knowledge>): Promise<Knowledge> {
    const knowledge = await this.findRaw(id);
    Object.assign(knowledge, data);
    return this.knowledgeRepository.save(knowledge);
  }

  async remove(id: string): Promise<void> {
    const knowledge = await this.findRaw(id);
    await this.knowledgeRepository.remove(knowledge);
  }

  async updateOwned(id:string,authorId:string,data:Partial<Knowledge>){const item=await this.findRaw(id);if(item.authorId!==authorId)throw new NotFoundException(`Knowledge #${id} not found`);Object.assign(item,data);return this.knowledgeRepository.save(item);}
  async removeOwned(id:string,authorId:string){const item=await this.findRaw(id);if(item.authorId!==authorId)throw new NotFoundException(`Knowledge #${id} not found`);await this.knowledgeRepository.remove(item);}
  private async findRaw(id:string){const item=await this.knowledgeRepository.findOne({where:{id}});if(!item)throw new NotFoundException(`Knowledge #${id} not found`);return item;}

  async getCategories(): Promise<{ category: string; count: number }[]> {
    const result = await this.knowledgeRepository
      .createQueryBuilder('knowledge')
      .select('knowledge.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('knowledge.category')
      .getRawMany();

    return result;
  }

  async search(keyword: string, limit = 10): Promise<Knowledge[]> {
    return this.knowledgeRepository.find({
      where: [
        { title: Like(`%${keyword}%`) },
        { content: Like(`%${keyword}%`) },
      ],
      take: limit,
      order: { viewCount: 'DESC' },
    });
  }
}
