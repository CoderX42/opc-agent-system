import { PartialType } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
export class CreateKnowledgeDto{
 @IsString() @MaxLength(200) title:string;
 @IsString() @MaxLength(200_000) content:string;
 @IsString() @MaxLength(50) category:string;
 @IsOptional() @IsArray() @IsString({each:true}) tags?:string[];
 @IsOptional() @IsString() @MaxLength(2000) summary?:string;
 @IsOptional() @IsIn(['DRAFT','PUBLISHED','ARCHIVED']) status?:string;
}
export class UpdateKnowledgeDto extends PartialType(CreateKnowledgeDto){}
