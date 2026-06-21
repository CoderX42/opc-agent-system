import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Ticket } from './entities/ticket.entity';
import { CustomerServiceService } from './customer-service.service';
import { CustomerServiceController } from './customer-service.controller';
import { ConversationMessage } from './entities/message.entity';
import { AiModule } from '../../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Ticket, ConversationMessage]), AiModule],
  controllers: [CustomerServiceController],
  providers: [CustomerServiceService],
  exports: [CustomerServiceService],
})
export class CustomerServiceModule {}
