import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OfficeService } from './office.service';

@ApiTags('Office')
@ApiBearerAuth('JWT')
@Controller('office')
@UseGuards(JwtAuthGuard)
export class OfficeController {
  constructor(private readonly office: OfficeService) {}

  @Get('state')
  state() {
    return this.office.getState();
  }
}