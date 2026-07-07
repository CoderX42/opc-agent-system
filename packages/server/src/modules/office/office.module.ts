import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from '../agent/entities/agent.entity';
import { OfficeController } from './office.controller';
import { OfficeService } from './office.service';

@Module({
  imports: [TypeOrmModule.forFeature([Agent])],
  controllers: [OfficeController],
  providers: [OfficeService],
})
export class OfficeModule {}