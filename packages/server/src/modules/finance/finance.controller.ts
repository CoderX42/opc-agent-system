import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FinanceService } from './finance.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionType } from './entities/transaction.entity';
import {
  ApproveInvoiceDto,
  CreateInvoiceDto,
  ExportReportDto,
  UpdateInvoiceDto,
} from './dto/invoice.dto';
import { CreateAccountDto } from './dto/account.dto';
import { KlineDetailQueryDto, KlineQueryDto } from './dto/kline-query.dto';

type AuthRequest = { user: { id: string } };

@ApiTags('Finance')
@ApiBearerAuth('JWT')
@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Post('invoices')
  createInvoice(@Request() req: AuthRequest, @Body() dto: CreateInvoiceDto) {
    return this.finance.createInvoice(req.user.id, dto);
  }

  @Post('invoices/ocr')
  recognizeInvoice(@Request() req: AuthRequest, @Body('filename') filename: string) {
    return this.finance.recognizeInvoiceImage(req.user.id, filename);
  }

  @Get('invoices')
  findInvoices(
    @Request() req: AuthRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.finance.findAllInvoices(req.user.id, page, limit, { status, type, startDate, endDate });
  }

  @Get('invoices/:id')
  findInvoice(@Request() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.finance.findOneInvoice(req.user.id, id);
  }

  @Patch('invoices/:id')
  updateInvoice(
    @Request() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.finance.updateInvoice(req.user.id, id, dto);
  }

  @Delete('invoices/:id')
  async deleteInvoice(@Request() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.finance.removeInvoice(req.user.id, id);
    return null;
  }

  @Post('invoices/:id/approve')
  approveInvoice(
    @Request() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveInvoiceDto,
  ) {
    return this.finance.approveInvoice(req.user.id, id, dto);
  }

  @Post('accounts')
  createAccount(@Request() req: AuthRequest, @Body() dto: CreateAccountDto) {
    return this.finance.createAccount(req.user.id, dto);
  }

  @Get('accounts')
  getAccounts(@Request() req: AuthRequest) {
    return this.finance.findAllAccounts(req.user.id);
  }

  @Post('transactions')
  createTransaction(@Request() req: AuthRequest, @Body() dto: CreateTransactionDto) {
    return this.finance.createTransaction(req.user.id, dto);
  }

  @Get('transactions')
  getTransactions(
    @Request() req: AuthRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('type') type?: TransactionType,
    @Query('category') category?: string,
  ) {
    return this.finance.findAllTransactions(req.user.id, page, limit, type, category);
  }

  @Patch('transactions/:id')
  updateTransaction(
    @Request() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.finance.updateTransaction(req.user.id, id, dto);
  }

  @Delete('transactions/:id')
  async deleteTransaction(@Request() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.finance.removeTransaction(req.user.id, id);
    return null;
  }

  @Get('summary')
  getSummary(@Request() req: AuthRequest) {
    return this.finance.getFinancialSummary(req.user.id);
  }

  @Get('overview')
  getOverview(@Request() req: AuthRequest) {
    return this.finance.getOverview(req.user.id);
  }

  @Post('report/export')
  @ApiOperation({ summary: '导出 CSV 财务报表' })
  exportReport(@Request() req: AuthRequest, @Body() dto: ExportReportDto) {
    return this.finance.exportReport(req.user.id, dto);
  }

  @Get('report/kline')
  @ApiOperation({ summary: '获取 K 线图数据(daily|monthly|yearly)' })
  getKline(@Request() req: AuthRequest, @Query() query: KlineQueryDto) {
    return this.finance.getKlineSeries(req.user.id, query.dimension, query.rangeDays);
  }

  @Get('report/kline/detail')
  @ApiOperation({ summary: '获取单根 K 线周期明细' })
  getKlineDetail(@Request() req: AuthRequest, @Query() query: KlineDetailQueryDto) {
    return this.finance.getKlinePeriodDetail(req.user.id, query.dimension, query.period);
  }
}
