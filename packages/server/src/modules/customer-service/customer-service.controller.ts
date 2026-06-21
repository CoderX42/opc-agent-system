import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CustomerServiceService } from './customer-service.service';
import { AssignTicketDto, ConversationMessageDto, CreateConversationDto, CreateTicketDto, ResolveTicketDto, TicketStatusDto, UpdateTicketDto } from './dto/customer-service.dto';
import { ConversationStatus } from './entities/conversation.entity';
import { TicketStatus } from './entities/ticket.entity';
type AuthRequest={user:{id:string}};

@ApiTags('Customer Service') @ApiBearerAuth('JWT') @Controller('customer-service') @UseGuards(JwtAuthGuard)
export class CustomerServiceController {
  constructor(private readonly service: CustomerServiceService) {}
  @Post('conversations') createConversation(@Request() r:AuthRequest,@Body() d:CreateConversationDto){return this.service.createConversation(r.user.id,d);}
  @Get('conversations') conversations(@Request() r:AuthRequest,@Query('page') p=1,@Query('limit') l=10,@Query('status') s?:ConversationStatus){return this.service.findAllConversations(r.user.id,p,l,s);}
  @Get('conversations/:id') conversation(@Request() r:AuthRequest,@Param('id',ParseUUIDPipe) id:string){return this.service.findOneConversation(r.user.id,id);}
  @Patch('conversations/:id/close') close(@Request() r:AuthRequest,@Param('id',ParseUUIDPipe) id:string){return this.service.closeConversation(r.user.id,id);}
  @Get('conversations/:id/messages') messages(@Request() r:AuthRequest,@Param('id',ParseUUIDPipe) id:string,@Query('page') p=1,@Query('limit') l=50){return this.service.getMessages(r.user.id,id,p,l);}
  @Post('conversations/:id/messages') send(@Request() r:AuthRequest,@Param('id',ParseUUIDPipe) id:string,@Body() d:ConversationMessageDto){return this.service.sendMessage(r.user.id,id,d.content);}
  @Post('tickets') createTicket(@Request() r:AuthRequest,@Body() d:CreateTicketDto){return this.service.createTicket(r.user.id,d);}
  @Get('tickets') tickets(@Request() r:AuthRequest,@Query('page') p=1,@Query('limit') l=10,@Query('status') s?:TicketStatus){return this.service.findAllTickets(r.user.id,p,l,s);}
  @Get('tickets/:id') ticket(@Request() r:AuthRequest,@Param('id',ParseUUIDPipe) id:string){return this.service.findOneTicket(r.user.id,id);}
  @Patch('tickets/:id') update(@Request() r:AuthRequest,@Param('id',ParseUUIDPipe) id:string,@Body() d:UpdateTicketDto){return this.service.updateTicket(r.user.id,id,d);}
  @Patch('tickets/:id/status') status(@Request() r:AuthRequest,@Param('id',ParseUUIDPipe) id:string,@Body() d:TicketStatusDto){return this.service.updateTicketStatus(r.user.id,id,d.status);}
  @Post('tickets/:id/assign') assign(@Request() r:AuthRequest,@Param('id',ParseUUIDPipe) id:string,@Body() d:AssignTicketDto){return this.service.assignTicket(r.user.id,id,d.assignee);}
  @Post('tickets/:id/resolve') resolve(@Request() r:AuthRequest,@Param('id',ParseUUIDPipe) id:string,@Body() d:ResolveTicketDto){return this.service.resolveTicket(r.user.id,id,d.resolution);}
  @Delete('tickets/:id') async remove(@Request() r:AuthRequest,@Param('id',ParseUUIDPipe) id:string){await this.service.removeTicket(r.user.id,id);return null;}
  @Get('overview') overview(@Request() r:AuthRequest){return this.service.getStats(r.user.id);}
  @Get('stats') stats(@Request() r:AuthRequest){return this.service.getStats(r.user.id);}
}
