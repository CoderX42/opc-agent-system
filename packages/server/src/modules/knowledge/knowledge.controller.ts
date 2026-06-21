import{Body,Controller,Delete,Get,Param,ParseUUIDPipe,Patch,Post,Query,Request,UseGuards}from'@nestjs/common';
import{ApiBearerAuth,ApiTags}from'@nestjs/swagger';
import{JwtAuthGuard}from'../../common/guards/jwt-auth.guard';
import{KnowledgeService}from'./knowledge.service';
import{CreateKnowledgeDto,UpdateKnowledgeDto}from'./dto/knowledge.dto';
type AuthRequest={user:{id:string}};
@ApiTags('Knowledge')@ApiBearerAuth('JWT')@Controller('knowledge')@UseGuards(JwtAuthGuard)
export class KnowledgeController{
 constructor(private readonly service:KnowledgeService){}
 @Post()create(@Request()r:AuthRequest,@Body()d:CreateKnowledgeDto){return this.service.create({...d,authorId:r.user.id});}
 @Get()list(@Query('page')p=1,@Query('limit')l=10,@Query('category')c?:string,@Query('keyword')k?:string){return this.service.findAll(p,l,c,k);}
 @Get('categories')categories(){return this.service.getCategories();}
 @Get('search')search(@Query('keyword')k:string,@Query('limit')l=10){return this.service.search(k,l);}
 @Get(':id')one(@Param('id',ParseUUIDPipe)id:string){return this.service.findOne(id);}
 @Patch(':id')update(@Request()r:AuthRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:UpdateKnowledgeDto){return this.service.updateOwned(id,r.user.id,d);}
 @Delete(':id')async remove(@Request()r:AuthRequest,@Param('id',ParseUUIDPipe)id:string){await this.service.removeOwned(id,r.user.id);return null;}
}
