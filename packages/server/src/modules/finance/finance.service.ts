import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { existsSync, mkdirSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { randomUUID } from 'crypto';
import { createWorker, PSM } from 'tesseract.js';
import { Invoice } from './entities/invoice.entity';
import { Account } from './entities/account.entity';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import {
  ApproveInvoiceDto,
  CreateInvoiceDto,
  ExportReportDto,
  UpdateInvoiceDto,
} from './dto/invoice.dto';
import { CreateAccountDto } from './dto/account.dto';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly config: ConfigService,
  ) {}

  async createInvoice(ownerId: string, dto: CreateInvoiceDto): Promise<Invoice> {
    const taxRate = dto.taxRate || 0;
    const invoice = this.invoiceRepository.create({
      amount: dto.amount,
      type: dto.type,
      category: dto.category || '其他',
      date: new Date(dto.invoiceDate),
      invoiceNo: dto.invoiceNo || `INV-${randomUUID().slice(0, 8).toUpperCase()}`,
      customerName: dto.customerName || null,
      vendor: dto.customerName,
      taxRate,
      taxAmount: Math.round(dto.amount * (taxRate / 100) * 100) / 100,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      description: dto.description,
      imageUrl: dto.imageUrl,
      attachments: dto.attachments || [],
      status: 'PENDING',
      ownerId,
    });
    const saved = await this.invoiceRepository.save(invoice);
    await this.invalidate(ownerId);
    return saved;
  }

  async recognizeInvoiceImage(ownerId: string, filename: string) {
    if (!filename || basename(filename) !== filename) {
      throw new BadRequestException('非法文件名');
    }
    const extension = extname(filename).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(extension)) {
      throw new BadRequestException('OCR 仅支持 JPG、PNG 图片');
    }

    const filePath = join(
      resolve(this.config.get('UPLOAD_DIR', 'uploads'), ownerId),
      filename,
    );
    if (!existsSync(filePath)) throw new NotFoundException('文件不存在');

    const cachePath = resolve(this.config.get('UPLOAD_DIR', 'uploads'), '.tess-cache');
    mkdirSync(cachePath, { recursive: true });

    const worker = await createWorker('chi_sim+eng', 1, {
      cachePath,
      logger: () => undefined,
    });
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      });
      const result = await worker.recognize(filePath);
      const text = result.data.text || '';
      return {
        text,
        fields: this.parseInvoiceOcrText(text),
      };
    } finally {
      await worker.terminate();
    }
  }

  async findAllInvoices(
    ownerId: string,
    page = 1,
    limit = 10,
    filters: { status?: string; type?: string; startDate?: string; endDate?: string } = {},
  ) {
    const pagination = this.pagination(page, limit);
    const where = {
      ownerId,
      ...(filters.status ? { status: filters.status.toUpperCase() } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.startDate && filters.endDate
        ? { date: Between(new Date(filters.startDate), new Date(filters.endDate)) }
        : {}),
    };
    const [items, total] = await this.invoiceRepository.findAndCount({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      order: { createdAt: 'DESC' },
    });
    return { items, total, page: pagination.page, pageSize: pagination.limit };
  }

  async findOneInvoice(ownerId: string, id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({ where: { id, ownerId } });
    if (!invoice) throw new NotFoundException(`Invoice #${id} not found`);
    return invoice;
  }

  async updateInvoice(ownerId: string, id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.findOneInvoice(ownerId, id);
    const { invoiceDate, dueDate, ...values } = dto;
    Object.assign(invoice, values);
    if (invoiceDate) invoice.date = new Date(invoiceDate);
    if (dueDate) invoice.dueDate = new Date(dueDate);
    if (dto.amount !== undefined || dto.taxRate !== undefined) {
      invoice.taxAmount =
        Math.round(Number(invoice.amount) * (Number(invoice.taxRate) / 100) * 100) /
        100;
    }
    const saved = await this.invoiceRepository.save(invoice);
    await this.invalidate(ownerId);
    return saved;
  }

  async approveInvoice(ownerId: string, id: string, dto: ApproveInvoiceDto) {
    const invoice = await this.findOneInvoice(ownerId, id);
    invoice.status = dto.approved ? 'APPROVED' : 'REJECTED';
    if (dto.reason) {
      invoice.description = [invoice.description, `审批意见：${dto.reason}`]
        .filter(Boolean)
        .join('\n');
    }
    const saved = await this.invoiceRepository.save(invoice);
    await this.invalidate(ownerId);
    return saved;
  }

  async removeInvoice(ownerId: string, id: string): Promise<void> {
    await this.invoiceRepository.remove(await this.findOneInvoice(ownerId, id));
    await this.invalidate(ownerId);
  }

  async createAccount(ownerId: string, dto: CreateAccountDto): Promise<Account> {
    return this.accountRepository.save(
      this.accountRepository.create({ ...dto, ownerId }),
    );
  }

  findAllAccounts(ownerId: string): Promise<Account[]> {
    return this.accountRepository.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  async createTransaction(
    ownerId: string,
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    const saved = await this.transactionRepository.save(
      this.transactionRepository.create({
        ...dto,
        date: new Date(dto.date),
        ownerId,
      }),
    );
    await this.invalidate(ownerId);
    return saved;
  }

  async findAllTransactions(
    ownerId: string,
    page = 1,
    limit = 10,
    type?: TransactionType,
    category?: string,
  ) {
    const pagination = this.pagination(page, limit);
    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.invoice', 'invoice')
      .where('transaction.ownerId = :ownerId', { ownerId });
    if (type) query.andWhere('transaction.type = :type', { type });
    if (category) query.andWhere('transaction.category = :category', { category });
    query
      .orderBy('transaction.createdAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.limit);
    const [items, total] = await query.getManyAndCount();
    return { items, total, page: pagination.page, pageSize: pagination.limit };
  }

  async findOneTransaction(ownerId: string, id: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { id, ownerId },
    });
    if (!transaction) throw new NotFoundException(`Transaction #${id} not found`);
    return transaction;
  }

  async updateTransaction(ownerId: string, id: string, dto: UpdateTransactionDto) {
    const transaction = await this.findOneTransaction(ownerId, id);
    const { date, ...values } = dto;
    Object.assign(transaction, values);
    if (date) transaction.date = new Date(date);
    const saved = await this.transactionRepository.save(transaction);
    await this.invalidate(ownerId);
    return saved;
  }

  async removeTransaction(ownerId: string, id: string): Promise<void> {
    await this.transactionRepository.remove(
      await this.findOneTransaction(ownerId, id),
    );
    await this.invalidate(ownerId);
  }

  async getFinancialSummary(ownerId: string) {
    const cacheKey = `finance:summary:${ownerId}`;
    const cached = await this.cache.get<Record<string, number>>(cacheKey);
    if (cached) return cached;
    const [transactionTotals, transactionCount, invoiceTotals] = await Promise.all([
      this.transactionRepository
        .createQueryBuilder('t')
        .select(
          `COALESCE(SUM(CASE WHEN t.type = :income THEN t.amount ELSE 0 END), 0)`,
          'income',
        )
        .addSelect(
          `COALESCE(SUM(CASE WHEN t.type = :expense THEN t.amount ELSE 0 END), 0)`,
          'expense',
        )
        .addSelect('COUNT(*)', 'count')
        .where('t.ownerId = :ownerId', { ownerId })
        .andWhere('t.invoiceId IS NULL')
        .setParameters({
          income: TransactionType.INCOME,
          expense: TransactionType.EXPENSE,
        })
        .getRawOne(),
      this.transactionRepository.count({ where: { ownerId } }),
      this.invoiceRepository
        .createQueryBuilder('i')
        .select(
          `COALESCE(SUM(CASE WHEN i.type = :income THEN i.amount ELSE 0 END), 0)`,
          'income',
        )
        .addSelect(
          `COALESCE(SUM(CASE WHEN i.type = :expense THEN i.amount ELSE 0 END), 0)`,
          'expense',
        )
        .where('i.ownerId = :ownerId', { ownerId })
        .andWhere('i.status = :status', { status: 'APPROVED' })
        .setParameters({ income: 'income', expense: 'expense' })
        .getRawOne(),
    ]);
    const totalIncome =
      Number(transactionTotals?.income || 0) + Number(invoiceTotals?.income || 0);
    const totalExpense =
      Number(transactionTotals?.expense || 0) + Number(invoiceTotals?.expense || 0);
    const summary = {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      netProfit: totalIncome - totalExpense,
      transactionCount,
    };
    await this.cache.set(cacheKey, summary, 10_000);
    return summary;
  }

  async getOverview(ownerId: string) {
    const [summary, pendingInvoices, transactionTrend, invoiceTrend, transactionCategories, invoiceCategories] =
      await Promise.all([
        this.getFinancialSummary(ownerId),
        this.invoiceRepository.count({ where: { ownerId, status: 'PENDING' } }),
        this.transactionRepository
          .createQueryBuilder('t')
          .select(`TO_CHAR(t.date, 'YYYY-MM')`, 'month')
          .addSelect(
            `SUM(CASE WHEN t.type = :income THEN t.amount ELSE 0 END)`,
            'income',
          )
          .addSelect(
            `SUM(CASE WHEN t.type = :expense THEN t.amount ELSE 0 END)`,
            'expense',
          )
          .where('t.ownerId = :ownerId', { ownerId })
          .andWhere('t.invoiceId IS NULL')
          .setParameters({
            income: TransactionType.INCOME,
            expense: TransactionType.EXPENSE,
          })
          .groupBy(`TO_CHAR(t.date, 'YYYY-MM')`)
          .orderBy('month', 'ASC')
          .limit(12)
          .getRawMany(),
        this.invoiceRepository
          .createQueryBuilder('i')
          .select(`TO_CHAR(i.date, 'YYYY-MM')`, 'month')
          .addSelect(
            `SUM(CASE WHEN i.type = :income THEN i.amount ELSE 0 END)`,
            'income',
          )
          .addSelect(
            `SUM(CASE WHEN i.type = :expense THEN i.amount ELSE 0 END)`,
            'expense',
          )
          .where('i.ownerId = :ownerId', { ownerId })
          .andWhere('i.status = :status', { status: 'APPROVED' })
          .setParameters({ income: 'income', expense: 'expense' })
          .groupBy(`TO_CHAR(i.date, 'YYYY-MM')`)
          .orderBy('month', 'ASC')
          .limit(12)
          .getRawMany(),
        this.transactionRepository
          .createQueryBuilder('t')
          .select('t.category', 'category')
          .addSelect('SUM(t.amount)', 'amount')
          .where('t.ownerId = :ownerId', { ownerId })
          .andWhere('t.invoiceId IS NULL')
          .andWhere('t.type = :expense', { expense: TransactionType.EXPENSE })
          .groupBy('t.category')
          .orderBy('amount', 'DESC')
          .limit(10)
          .getRawMany(),
        this.invoiceRepository
          .createQueryBuilder('i')
          .select('i.category', 'category')
          .addSelect('SUM(i.amount)', 'amount')
          .where('i.ownerId = :ownerId', { ownerId })
          .andWhere('i.status = :status', { status: 'APPROVED' })
          .andWhere('i.type = :expense', { expense: 'expense' })
          .groupBy('i.category')
          .orderBy('amount', 'DESC')
          .limit(10)
          .getRawMany(),
      ]);
    return {
      ...summary,
      pendingInvoices,
      monthlyTrend: this.mergeMonthlyTrend(transactionTrend, invoiceTrend),
      categoryDistribution: this.mergeCategoryDistribution(
        transactionCategories,
        invoiceCategories,
      ),
    };
  }

  private mergeMonthlyTrend(
    ...groups: Array<Array<{ month: string; income: string | number; expense: string | number }>>
  ) {
    const byMonth = new Map<string, { month: string; income: number; expense: number }>();
    for (const group of groups) {
      for (const item of group) {
        const current = byMonth.get(item.month) || {
          month: item.month,
          income: 0,
          expense: 0,
        };
        current.income += Number(item.income || 0);
        current.expense += Number(item.expense || 0);
        byMonth.set(item.month, current);
      }
    }
    return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
  }

  private mergeCategoryDistribution(
    ...groups: Array<Array<{ category: string; amount: string | number }>>
  ) {
    const byCategory = new Map<string, number>();
    for (const group of groups) {
      for (const item of group) {
        const category = item.category || '其他';
        byCategory.set(category, (byCategory.get(category) || 0) + Number(item.amount || 0));
      }
    }
    return Array.from(byCategory.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }

  private parseInvoiceOcrText(text: string) {
    const normalized = text
      .replace(/[，,]/g, '')
      .replace(/[：﹕]/g, ':')
      .replace(/\s+/g, ' ')
      .trim();
    const compact = normalized.replace(/\s/g, '');

    const invoiceNo = this.firstMatch(compact, [
      /发票(?:代码|号码|号)[:：]?([A-Z0-9-]{6,30})/i,
      /No\.?[:：]?([A-Z0-9-]{6,30})/i,
    ]);
    const invoiceDate = this.normalizeOcrDate(
      this.firstMatch(compact, [
        /开票日期[:：]?(\d{4}[年\-/.]\d{1,2}[月\-/.]\d{1,2})/,
        /日期[:：]?(\d{4}[年\-/.]\d{1,2}[月\-/.]\d{1,2})/,
        /(\d{4}[年\-/.]\d{1,2}[月\-/.]\d{1,2})/,
      ]),
    );
    const subtotalAmount = this.parseOcrAmount(
      this.firstMatch(compact, [
        /(?:金额|不含税金额)[:：]?[¥￥]?([0-9]+(?:\.[0-9]{1,2})?)(?:税率|税额)/,
      ]),
    );
    const totalAmount =
      this.parseOcrAmount(
        this.firstMatch(compact, [
          /价税合计(?:\(小写\)|（小写）)?[¥￥]?([0-9]+(?:\.[0-9]{1,2})?)/,
          /小写[¥￥]?([0-9]+(?:\.[0-9]{1,2})?)/,
          /合计[¥￥]?([0-9]+(?:\.[0-9]{1,2})?)/,
        ]),
      ) ||
      this.maxAmount(
        [...compact.matchAll(/[¥￥]([0-9]+(?:\.[0-9]{1,2})?)/g)].map(
          (item) => item[1],
        ),
      );
    const taxAmount = this.parseOcrAmount(
      this.firstMatch(compact, [
        /税额[¥￥]?([0-9]+(?:\.[0-9]{1,2})?)/,
        /税额[:：]?([0-9]+(?:\.[0-9]{1,2})?)/,
      ]),
    );
    const taxRate = this.parseOcrAmount(
      this.firstMatch(compact, [/税率[:：]?([0-9]+(?:\.[0-9]{1,2})?)%/]),
    );
    const amount =
      subtotalAmount ||
      (totalAmount && taxAmount
        ? Math.max(0, Math.round((totalAmount - taxAmount) * 100) / 100)
        : totalAmount);
    const customerName = this.firstMatch(compact, [
      /购买方名称[:：]?(.{2,60}?)(?:纳税人识别号|税号|地址|开户行|销售方|密码区|货物|项目名称)/,
      /购方名称[:：]?(.{2,60}?)(?:纳税人识别号|税号|地址|开户行|销售方|密码区|货物|项目名称)/,
      /销售方名称[:：]?(.{2,60}?)(?:纳税人识别号|税号|地址|开户行|备注|合计|价税合计)/,
    ]);

    return {
      invoiceNo,
      customerName,
      amount,
      taxAmount,
      taxRate,
      invoiceDate,
      description: normalized ? `OCR识别文本：${normalized.slice(0, 500)}` : undefined,
    };
  }

  private firstMatch(text: string, patterns: RegExp[]) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      const value = match?.[1]?.trim();
      if (value) return value;
    }
    return undefined;
  }

  private parseOcrAmount(value?: string) {
    if (!value) return undefined;
    const amount = Number(value.replace(/[^\d.]/g, ''));
    return Number.isFinite(amount) ? amount : undefined;
  }

  private maxAmount(values: string[]) {
    const amounts = values
      .map((value) => this.parseOcrAmount(value))
      .filter((value): value is number => value !== undefined);
    return amounts.length ? Math.max(...amounts) : undefined;
  }

  private normalizeOcrDate(value?: string) {
    if (!value) return undefined;
    const match = value.match(/(\d{4})[年\-/.](\d{1,2})[月\-/.](\d{1,2})/);
    if (!match) return undefined;
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  async exportReport(ownerId: string, dto: ExportReportDto) {
    const items = await this.transactionRepository.find({
      where: {
        ownerId,
        date: Between(new Date(dto.startDate), new Date(dto.endDate)),
      },
      order: { date: 'ASC' },
      take: 10_000,
    });
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['日期', '类型', '分类', '金额', '往来方', '说明'],
      ...items.map((item) => [
        item.date.toISOString().slice(0, 10),
        item.type,
        item.category,
        item.amount,
        item.counterparty,
        item.description,
      ]),
    ];
    const csv = rows.map((row) => row.map(escape).join(',')).join('\n');
    return {
      filename: `finance-${dto.startDate}-${dto.endDate}.csv`,
      count: items.length,
      downloadUrl: `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`,
    };
  }

  private pagination(page: number, limit: number) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
    return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
  }

  private async invalidate(ownerId: string): Promise<void> {
    await this.cache.del(`finance:summary:${ownerId}`);
  }
}
