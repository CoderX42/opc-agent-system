import { Body,Controller,Delete,Get,Param,ParseUUIDPipe,Patch,Post,Query,Request,UseGuards } from '@nestjs/common';
import { ApiBearerAuth,ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LegalService } from './legal.service';
import { ComplianceStatusDto,ContractDecisionDto,CreateComplianceDto,CreateContractDto,UpdateContractDto } from './dto/legal.dto';
import { ContractStatus } from './entities/contract.entity';
type AuthRequest={user:{id:string}};
@ApiTags('Legal') @ApiBearerAuth('JWT') @Controller('legal') @UseGuards(JwtAuthGuard)
export class LegalController{
 constructor(private readonly service:LegalService){}
 @Post('contracts') create(@Request()r:AuthRequest,@Body()d:CreateContractDto){return this.service.createContract(r.user.id,d);}
 @Get('contracts') list(@Request()r:AuthRequest,@Query('page')p=1,@Query('limit')l=10,@Query('status')s?:ContractStatus){return this.service.findAllContracts(r.user.id,p,l,s);}
 @Get('contracts/:id') one(@Request()r:AuthRequest,@Param('id',ParseUUIDPipe)id:string){return this.service.findOneContract(r.user.id,id);}
 @Patch('contracts/:id') update(@Request()r:AuthRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:UpdateContractDto){return this.service.updateContract(r.user.id,id,d);}
 @Delete('contracts/:id') async remove(@Request()r:AuthRequest,@Param('id',ParseUUIDPipe)id:string){await this.service.removeContract(r.user.id,id);return null;}
 @Post('contracts/:id/submit-review') submit(@Request()r:AuthRequest,@Param('id',ParseUUIDPipe)id:string){return this.service.submitReview(r.user.id,id);}
 @Post('contracts/:id/ai-review') aiReview(@Request()r:AuthRequest,@Param('id',ParseUUIDPipe)id:string){return this.service.reviewContract(r.user.id,id);}
 @Post('contracts/:id/review') decide(@Request()r:AuthRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:ContractDecisionDto){return this.service.decide(r.user.id,id,d.approved,d.comment);}
 @Post('compliance') createCompliance(@Request()r:AuthRequest,@Body()d:CreateComplianceDto){return this.service.createCompliance(r.user.id,d);}
 @Get('compliance') compliance(@Request()r:AuthRequest,@Query('page')p=1,@Query('limit')l=10,@Query('status')s?:string){return this.service.listCompliance(r.user.id,p,l,s);}
 @Patch('compliance/:id') updateCompliance(@Request()r:AuthRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:ComplianceStatusDto){return this.service.updateCompliance(r.user.id,id,d.status);}
 @Post('compliance/run-check') run(@Request()r:AuthRequest){return this.service.runCompliance(r.user.id);}
 @Get('overview') overview(@Request()r:AuthRequest){return this.service.stats(r.user.id);}
 @Get('stats') stats(@Request()r:AuthRequest){return this.service.stats(r.user.id);}
}
