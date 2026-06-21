import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { AiService } from '../../ai/ai.service';
import { Contract, ContractStatus } from './entities/contract.entity';
import { ComplianceRecord } from './entities/compliance-record.entity';
import { CreateComplianceDto, CreateContractDto, UpdateContractDto } from './dto/legal.dto';

export interface ReviewResult extends Record<string, unknown> { riskLevel:string; issues:string[]; suggestions:string[]; summary:string; }
@Injectable()
export class LegalService {
  constructor(@InjectRepository(Contract) private readonly contracts:Repository<Contract>,@InjectRepository(ComplianceRecord) private readonly compliance:Repository<ComplianceRecord>,private readonly ai:AiService){}
  async createContract(ownerId:string,dto:CreateContractDto){const {signDate,expiryDate,...v}=dto;return this.contracts.save(this.contracts.create({...v,signDate:signDate?new Date(signDate):undefined,expiryDate:expiryDate?new Date(expiryDate):undefined,ownerId}));}
  async findAllContracts(ownerId:string,page=1,limit=10,status?:ContractStatus){const p=this.page(page,limit);const [items,total]=await this.contracts.findAndCount({where:{ownerId,...(status?{status}:{})},skip:p.skip,take:p.limit,order:{updatedAt:'DESC'}});return{items,total,page:p.page,pageSize:p.limit};}
  async findOneContract(ownerId:string,id:string){const item=await this.contracts.findOne({where:{id,ownerId}});if(!item)throw new NotFoundException(`Contract #${id} not found`);return item;}
  async updateContract(ownerId:string,id:string,dto:UpdateContractDto){const item=await this.findOneContract(ownerId,id);const{signDate,expiryDate,...v}=dto;Object.assign(item,v);if(signDate)item.signDate=new Date(signDate);if(expiryDate)item.expiryDate=new Date(expiryDate);return this.contracts.save(item);}
  async removeContract(ownerId:string,id:string){await this.contracts.remove(await this.findOneContract(ownerId,id));}
  async submitReview(ownerId:string,id:string){return this.updateContract(ownerId,id,{status:ContractStatus.REVIEWING});}
  async reviewContract(ownerId:string,id:string):Promise<{contractId:string;reviewResult:ReviewResult}>{const item=await this.findOneContract(ownerId,id);item.status=ContractStatus.REVIEWING;await this.contracts.save(item);let result:ReviewResult;try{const raw=await this.ai.simpleChat(`请审查以下合同并严格返回JSON，字段为riskLevel、issues、suggestions、summary：\n${item.content}`,'你是合同风险审查助手。不得提供虚假的法律结论，输出有效JSON。');result=JSON.parse(raw.replace(/^```json|```$/g,'').trim()) as ReviewResult;}catch{result=this.ruleReview(item.content,item.title);}item.reviewResult=result;await this.contracts.save(item);return{contractId:item.id,reviewResult:result};}
  async decide(ownerId:string,id:string,approved:boolean,comment?:string){const item=await this.findOneContract(ownerId,id);item.status=approved?ContractStatus.APPROVED:ContractStatus.REJECTED;item.reviewResult={...(item.reviewResult||{}),decisionComment:comment||''};return this.contracts.save(item);}
  async createCompliance(ownerId:string,dto:CreateComplianceDto){return this.compliance.save(this.compliance.create({...dto,dueDate:dto.dueDate?new Date(dto.dueDate):undefined,ownerId}));}
  async listCompliance(ownerId:string,page=1,limit=10,status?:string){const p=this.page(page,limit);const[items,total]=await this.compliance.findAndCount({where:{ownerId,...(status?{status}:{})},skip:p.skip,take:p.limit,order:{createdAt:'DESC'}});return{items,total,page:p.page,pageSize:p.limit};}
  async updateCompliance(ownerId:string,id:string,status:string){const item=await this.compliance.findOne({where:{id,ownerId}});if(!item)throw new NotFoundException(`Compliance #${id} not found`);item.status=status.toUpperCase();return this.compliance.save(item);}
  async runCompliance(ownerId:string){const items=await this.compliance.find({where:{ownerId}});const now=new Date();for(const item of items){item.status=item.dueDate&&item.dueDate<now?'FAIL':'PASS';item.result={checkedAt:now.toISOString(),reason:item.status==='FAIL'?'已超过整改期限':'当前检查通过'};}return this.compliance.save(items);}
  async stats(ownerId:string){const now=new Date(),next30=new Date(Date.now()+30*86400000);const[activeContracts,expiringContracts,pendingReviews,totalCompliance,passedCompliance]=await Promise.all([this.contracts.count({where:{ownerId,status:ContractStatus.SIGNED}}),this.contracts.count({where:{ownerId,expiryDate:LessThanOrEqual(next30)}}),this.contracts.count({where:{ownerId,status:ContractStatus.REVIEWING}}),this.compliance.count({where:{ownerId}}),this.compliance.count({where:{ownerId,status:'PASS'}})]);return{activeContracts,expiringContracts,pendingReviews,complianceRate:totalCompliance?Math.round(passedCompliance/totalCompliance*100):100,monthlyStats:[],generatedAt:now};}
  private ruleReview(content:string,title:string):ReviewResult{const issues:string[]=[];if(!/违约|赔偿/.test(content))issues.push('缺少明确的违约责任条款');if(!/争议|仲裁|法院/.test(content))issues.push('缺少争议解决条款');if(!/保密/.test(content))issues.push('未发现保密义务约定');return{riskLevel:issues.length>=2?'HIGH':issues.length?'MEDIUM':'LOW',issues,suggestions:issues.map(x=>`建议补充：${x}`),summary:`合同“${title}”完成规则审查，共发现 ${issues.length} 项风险。结果仅供辅助参考。`};}
  private page(page:number,limit:number){const p=Math.max(1,Number(page)||1),l=Math.min(100,Math.max(1,Number(limit)||10));return{page:p,limit:l,skip:(p-1)*l};}
}
