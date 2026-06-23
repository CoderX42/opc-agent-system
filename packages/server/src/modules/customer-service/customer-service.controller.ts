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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CustomerServiceService } from './customer-service.service';
import {
  AssignTicketDto,
  ConversationMessageDto,
  ConversationQueryDto,
  CreateConversationDto,
  CreateTicketDto,
  ResolveTicketDto,
  TicketQueryDto,
  TicketStatusDto,
  UpdateTicketDto,
} from './dto/customer-service.dto';

type AuthRequest = { user: { id: string } };

@ApiTags('Customer Service')
@ApiBearerAuth('JWT')
@Controller('customer-service')
@UseGuards(JwtAuthGuard)
export class CustomerServiceController {
  constructor(private readonly service: CustomerServiceService) {}

  @Post('conversations')
  createConversation(
    @Request() request: AuthRequest,
    @Body() dto: CreateConversationDto,
  ) {
    return this.service.createConversation(request.user.id, dto);
  }

  @Get('conversations')
  conversations(
    @Request() request: AuthRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query() filters: ConversationQueryDto,
  ) {
    return this.service.findAllConversations(
      request.user.id,
      page,
      limit,
      filters,
    );
  }

  @Get('conversations/:id')
  conversation(
    @Request() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOneConversation(request.user.id, id);
  }

  @Patch('conversations/:id/close')
  close(
    @Request() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.closeConversation(request.user.id, id);
  }

  @Get('conversations/:id/messages')
  messages(
    @Request() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.service.getMessages(request.user.id, id, page, limit);
  }

  @Post('conversations/:id/messages')
  send(
    @Request() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConversationMessageDto,
  ) {
    return this.service.sendMessage(request.user.id, id, dto.content);
  }

  @Post('conversations/:id/ticket')
  createTicketFromConversation(
    @Request() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateTicketDto>,
  ) {
    return this.service.createTicketFromConversation(request.user.id, id, dto);
  }

  @Post('tickets')
  createTicket(@Request() request: AuthRequest, @Body() dto: CreateTicketDto) {
    return this.service.createTicket(request.user.id, dto);
  }

  @Get('tickets')
  tickets(
    @Request() request: AuthRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query() filters: TicketQueryDto,
  ) {
    return this.service.findAllTickets(request.user.id, page, limit, filters);
  }

  @Get('tickets/:id')
  ticket(
    @Request() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOneTicket(request.user.id, id);
  }

  @Patch('tickets/:id')
  update(
    @Request() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.service.updateTicket(request.user.id, id, dto);
  }

  @Patch('tickets/:id/status')
  status(
    @Request() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TicketStatusDto,
  ) {
    return this.service.updateTicketStatus(request.user.id, id, dto.status);
  }

  @Post('tickets/:id/assign')
  assign(
    @Request() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTicketDto,
  ) {
    return this.service.assignTicket(request.user.id, id, dto.assignee);
  }

  @Post('tickets/:id/resolve')
  resolve(
    @Request() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveTicketDto,
  ) {
    return this.service.resolveTicket(request.user.id, id, dto.resolution);
  }

  @Delete('tickets/:id')
  async remove(
    @Request() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.service.removeTicket(request.user.id, id);
    return null;
  }

  @Get('overview')
  overview(@Request() request: AuthRequest) {
    return this.service.getStats(request.user.id);
  }

  @Get('stats')
  stats(@Request() request: AuthRequest) {
    return this.service.getStats(request.user.id);
  }
}
