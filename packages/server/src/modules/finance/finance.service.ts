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

  async getAgentContext(ownerId: string) {
    const [overview, recentTransactions, recentInvoices] = await Promise.all([
      this.getOverview(ownerId),
      this.transactionRepository.find({
        where: { ownerId },
        order: { date: 'DESC', createdAt: 'DESC' },
        take: 10,
      }),
      this.invoiceRepository.find({
        where: { ownerId },
        order: { date: 'DESC', createdAt: 'DESC' },
        take: 10,
      }),
    ]);

    return {
      overview,
      recentTransactions: recentTransactions.map((item) => ({
        date: this.formatDate(this.toLocalDate(item.date)),
        type: item.type,
        amount: Number(item.amount),
        category: item.category,
        account: item.account,
        counterparty: item.counterparty,
        description: item.description,
      })),
      recentInvoices: recentInvoices.map((item) => ({
        date: this.formatDate(this.toLocalDate(item.date)),
        type: item.type,
        amount: Number(item.amount),
        category: item.category,
        status: item.status,
        invoiceNo: item.invoiceNo,
        vendor: item.vendor,
        customerName: item.customerName,
        description: item.description,
      })),
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
    await Promise.all([
      this.cache.del(`finance:summary:${ownerId}`),
      this.cache.set(`finance:kline:version:${ownerId}`, Date.now(), 300_000),
    ]);
  }

  async getKlineSeries(
    ownerId: string,
    dimension: 'daily' | 'monthly' | 'yearly' = 'monthly',
    rangeDays = 365,
  ): Promise<
    Array<{
      x: string;
      o: number;
      c: number;
      h: number;
      l: number;
      income: number;
      expense: number;
      count: number;
      empty: boolean;
    }>
  > {
    const safeDimension: 'daily' | 'monthly' | 'yearly' =
      dimension === 'daily' || dimension === 'monthly' || dimension === 'yearly'
        ? dimension
        : 'monthly';
    const safeRange = Math.min(3650, Math.max(30, Number(rangeDays) || 365));
    const cacheVersion = (await this.cache.get<number>(`finance:kline:version:${ownerId}`)) || 1;
    const cacheKey = `finance:kline:${ownerId}:${cacheVersion}:${safeDimension}:${safeRange}`;
    const cached = await this.cache.get<unknown>(cacheKey);
    if (cached) return cached as never;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - safeRange + 1);
    const windowStart = this.periodStart(start, safeDimension);
    const windowEnd = this.nextPeriodStart(today, safeDimension);

    const [openingTx, openingInv, txRows, invRows] = await Promise.all([
      this.transactionRepository
        .createQueryBuilder('t')
        .select(
          `COALESCE(SUM(CASE WHEN t.type = :income THEN t.amount ELSE -t.amount END), 0)`,
          'balance',
        )
        .where('t.ownerId = :ownerId', { ownerId })
        .andWhere('t.invoiceId IS NULL')
        .andWhere('t.date < :windowStart', { windowStart })
        .setParameters({ income: TransactionType.INCOME })
        .getRawOne(),
      this.invoiceRepository
        .createQueryBuilder('i')
        .select(
          `COALESCE(SUM(CASE WHEN i.type = :income THEN i.amount ELSE -i.amount END), 0)`,
          'balance',
        )
        .where('i.ownerId = :ownerId', { ownerId })
        .andWhere('i.status = :status', { status: 'APPROVED' })
        .andWhere('i.date < :windowStart', { windowStart })
        .setParameters({ income: 'income' })
        .getRawOne(),
      this.transactionRepository
        .createQueryBuilder('t')
        .select('t.date', 'date')
        .addSelect('t.id', 'id')
        .addSelect('t.createdAt', 'createdAt')
        .addSelect('t.type', 'type')
        .addSelect('t.amount', 'amount')
        .where('t.ownerId = :ownerId', { ownerId })
        .andWhere('t.invoiceId IS NULL')
        .andWhere('t.date >= :windowStart', { windowStart })
        .andWhere('t.date < :windowEnd', { windowEnd })
        .orderBy('t.date', 'ASC')
        .getRawMany(),
      this.invoiceRepository
        .createQueryBuilder('i')
        .select('i.date', 'date')
        .addSelect('i.id', 'id')
        .addSelect('i.createdAt', 'createdAt')
        .addSelect('i.type', 'type')
        .addSelect('i.amount', 'amount')
        .where('i.ownerId = :ownerId', { ownerId })
        .andWhere('i.status = :status', { status: 'APPROVED' })
        .andWhere('i.date >= :windowStart', { windowStart })
        .andWhere('i.date < :windowEnd', { windowEnd })
        .orderBy('i.date', 'ASC')
        .getRawMany(),
    ]);

    type Row = { id: string; date: Date; createdAt: Date; type: string; amount: number };
    const rows: Row[] = [...txRows, ...invRows]
      .map((r) => ({
        id: String(r.id || ''),
        date: this.toLocalDate(r.date),
        createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt),
        type: String(r.type),
        amount: Number(r.amount || 0),
      }))
      .sort((a, b) => {
        const dateDiff = a.date.getTime() - b.date.getTime();
        if (dateDiff) return dateDiff;
        const createdDiff = a.createdAt.getTime() - b.createdAt.getTime();
        if (createdDiff) return createdDiff;
        return a.id.localeCompare(b.id);
      });

    let runningBalance =
      Number(openingTx?.balance || 0) + Number(openingInv?.balance || 0);

    const rowsByBucket = new Map<string, Row[]>();
    rows.forEach((row) => {
      const key = this.bucketKey(row.date, safeDimension);
      const bucketRows = rowsByBucket.get(key);
      if (bucketRows) {
        bucketRows.push(row);
      } else {
        rowsByBucket.set(key, [row]);
      }
    });

    const series = this.periodStarts(windowStart, today, safeDimension).map((period) => {
      const key = this.bucketKey(period, safeDimension);
      const bucketRows = rowsByBucket.get(key) || [];
      const open = this.round2(runningBalance);
      const bucket = {
        x: this.bucketLabel(period, safeDimension),
        o: open,
        c: open,
        h: open,
        l: open,
        income: 0,
        expense: 0,
        count: 0,
      };

      bucketRows.forEach((row) => {
        const net = row.type === 'INCOME' || row.type === 'income'
          ? Number(row.amount || 0)
          : -Number(row.amount || 0);
        runningBalance += net;
        bucket.c = this.round2(runningBalance);
        bucket.h = Math.max(bucket.h, bucket.c);
        bucket.l = Math.min(bucket.l, bucket.c);
        if (net >= 0) bucket.income += net;
        else bucket.expense += -net;
        bucket.count += 1;
      });

      return {
        x: bucket.x,
        o: this.round2(bucket.o),
        c: this.round2(bucket.c),
        h: this.round2(bucket.h),
        l: this.round2(bucket.l),
        income: this.round2(bucket.income),
        expense: this.round2(bucket.expense),
        count: bucket.count,
        empty: bucket.count === 0,
      };
    });

    await this.cache.set(cacheKey, series, 60_000);
    return series;
  }

  async getKlinePeriodDetail(
    ownerId: string,
    dimension: 'daily' | 'monthly' | 'yearly' = 'daily',
    period: string,
  ) {
    const safeDimension: 'daily' | 'monthly' | 'yearly' =
      dimension === 'daily' || dimension === 'monthly' || dimension === 'yearly'
        ? dimension
        : 'daily';
    const start = this.parsePeriodLabel(period, safeDimension);
    if (!start) throw new BadRequestException('非法 K 线周期');
    const end = this.nextPeriodStart(start, safeDimension);

    const [openingTx, openingInv, txRows, invRows] = await Promise.all([
      this.transactionRepository
        .createQueryBuilder('t')
        .select(
          `COALESCE(SUM(CASE WHEN t.type = :income THEN t.amount ELSE -t.amount END), 0)`,
          'balance',
        )
        .where('t.ownerId = :ownerId', { ownerId })
        .andWhere('t.invoiceId IS NULL')
        .andWhere('t.date < :start', { start })
        .setParameters({ income: TransactionType.INCOME })
        .getRawOne(),
      this.invoiceRepository
        .createQueryBuilder('i')
        .select(
          `COALESCE(SUM(CASE WHEN i.type = :income THEN i.amount ELSE -i.amount END), 0)`,
          'balance',
        )
        .where('i.ownerId = :ownerId', { ownerId })
        .andWhere('i.status = :status', { status: 'APPROVED' })
        .andWhere('i.date < :start', { start })
        .setParameters({ income: 'income' })
        .getRawOne(),
      this.transactionRepository
        .createQueryBuilder('t')
        .select('t.id', 'id')
        .addSelect('t.date', 'date')
        .addSelect('t.createdAt', 'createdAt')
        .addSelect('t.type', 'type')
        .addSelect('t.amount', 'amount')
        .addSelect('t.category', 'category')
        .addSelect('t.counterparty', 'counterparty')
        .addSelect('t.description', 'description')
        .where('t.ownerId = :ownerId', { ownerId })
        .andWhere('t.invoiceId IS NULL')
        .andWhere('t.date >= :start', { start })
        .andWhere('t.date < :end', { end })
        .orderBy('t.date', 'ASC')
        .addOrderBy('t.createdAt', 'ASC')
        .getRawMany(),
      this.invoiceRepository
        .createQueryBuilder('i')
        .select('i.id', 'id')
        .addSelect('i.date', 'date')
        .addSelect('i.createdAt', 'createdAt')
        .addSelect('i.type', 'type')
        .addSelect('i.amount', 'amount')
        .addSelect('i.category', 'category')
        .addSelect('i.vendor', 'vendor')
        .addSelect('i.customerName', 'customerName')
        .addSelect('i.description', 'description')
        .where('i.ownerId = :ownerId', { ownerId })
        .andWhere('i.status = :status', { status: 'APPROVED' })
        .andWhere('i.date >= :start', { start })
        .andWhere('i.date < :end', { end })
        .orderBy('i.date', 'ASC')
        .addOrderBy('i.createdAt', 'ASC')
        .getRawMany(),
    ]);

    type DetailRow = {
      id: string;
      source: 'transaction' | 'invoice';
      date: Date;
      createdAt: Date;
      type: string;
      amount: number;
      category: string;
      counterparty: string;
      description: string;
    };

    const rows: DetailRow[] = [
      ...txRows.map((r) => ({
        id: String(r.id || ''),
        source: 'transaction' as const,
        date: this.toLocalDate(r.date),
        createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt),
        type: String(r.type),
        amount: Number(r.amount || 0),
        category: String(r.category || '其他'),
        counterparty: String(r.counterparty || ''),
        description: String(r.description || ''),
      })),
      ...invRows.map((r) => ({
        id: String(r.id || ''),
        source: 'invoice' as const,
        date: this.toLocalDate(r.date),
        createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt),
        type: String(r.type),
        amount: Number(r.amount || 0),
        category: String(r.category || '其他'),
        counterparty: String(r.customerName || r.vendor || ''),
        description: String(r.description || ''),
      })),
    ].sort((a, b) => {
      const dateDiff = a.date.getTime() - b.date.getTime();
      if (dateDiff) return dateDiff;
      const createdDiff = a.createdAt.getTime() - b.createdAt.getTime();
      if (createdDiff) return createdDiff;
      return a.id.localeCompare(b.id);
    });

    let runningBalance =
      Number(openingTx?.balance || 0) + Number(openingInv?.balance || 0);
    const open = this.round2(runningBalance);
    let high = open;
    let low = open;
    let income = 0;
    let expense = 0;

    const items = rows.map((row) => {
      const signedAmount = row.type === 'INCOME' || row.type === 'income'
        ? row.amount
        : -row.amount;
      runningBalance += signedAmount;
      const balanceAfter = this.round2(runningBalance);
      high = Math.max(high, balanceAfter);
      low = Math.min(low, balanceAfter);
      if (signedAmount >= 0) income += signedAmount;
      else expense += -signedAmount;
      return {
        id: row.id,
        source: row.source,
        date: this.formatDate(row.date),
        type: row.type,
        amount: this.round2(row.amount),
        signedAmount: this.round2(signedAmount),
        category: row.category,
        counterparty: row.counterparty,
        description: row.description,
        balanceAfter,
      };
    });

    const close = this.round2(runningBalance);
    return {
      period: this.bucketLabel(start, safeDimension),
      dimension: safeDimension,
      range: {
        start: this.formatDate(start),
        end: this.formatDate(new Date(end.getTime() - 24 * 60 * 60 * 1000)),
      },
      o: open,
      c: close,
      h: this.round2(high),
      l: this.round2(low),
      income: this.round2(income),
      expense: this.round2(expense),
      count: items.length,
      empty: items.length === 0,
      items,
    };
  }

  private bucketKey(date: Date, dimension: 'daily' | 'monthly' | 'yearly'): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    if (dimension === 'daily') return `${y}-${m}-${d}`;
    if (dimension === 'monthly') return `${y}-${m}`;
    return `${y}`;
  }

  private bucketLabel(date: Date, dimension: 'daily' | 'monthly' | 'yearly'): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    if (dimension === 'daily') return `${y}-${m}-${d}`;
    if (dimension === 'monthly') return `${y}-${m}`;
    return `${y}年`;
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  private toLocalDate(value: Date | string): Date {
    if (value instanceof Date) return value;
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return new Date(value);
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private parsePeriodLabel(
    period: string,
    dimension: 'daily' | 'monthly' | 'yearly',
  ): Date | null {
    const normalized = period.trim().replace('年', '');
    if (dimension === 'daily') {
      const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return null;
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
    if (dimension === 'monthly') {
      const match = normalized.match(/^(\d{4})-(\d{2})$/);
      if (!match) return null;
      return new Date(Number(match[1]), Number(match[2]) - 1, 1);
    }
    const match = normalized.match(/^(\d{4})$/);
    if (!match) return null;
    return new Date(Number(match[1]), 0, 1);
  }

  private periodStart(date: Date, dimension: 'daily' | 'monthly' | 'yearly'): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    if (dimension === 'monthly') start.setDate(1);
    if (dimension === 'yearly') {
      start.setMonth(0, 1);
    }
    return start;
  }

  private periodStarts(
    start: Date,
    end: Date,
    dimension: 'daily' | 'monthly' | 'yearly',
  ): Date[] {
    const periods: Date[] = [];
    const cursor = this.periodStart(start, dimension);
    const last = this.periodStart(end, dimension);
    while (cursor.getTime() <= last.getTime()) {
      periods.push(new Date(cursor));
      if (dimension === 'daily') cursor.setDate(cursor.getDate() + 1);
      else if (dimension === 'monthly') cursor.setMonth(cursor.getMonth() + 1);
      else cursor.setFullYear(cursor.getFullYear() + 1);
    }
    return periods;
  }

  private nextPeriodStart(date: Date, dimension: 'daily' | 'monthly' | 'yearly'): Date {
    const next = this.periodStart(date, dimension);
    if (dimension === 'daily') next.setDate(next.getDate() + 1);
    else if (dimension === 'monthly') next.setMonth(next.getMonth() + 1);
    else next.setFullYear(next.getFullYear() + 1);
    return next;
  }
}
