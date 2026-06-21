import { PartialType } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';
import { TaskStatus } from '../entities/task.entity';

export class CreateScheduleDto {
  @IsString() @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsDateString() startTime: string;
  @IsOptional() @IsDateString() endTime?: string;
  @IsOptional() @IsString() @MaxLength(50) type?: string;
  @IsOptional() @IsString() @MaxLength(100) location?: string;
  @IsOptional() @IsBoolean() isAllDay?: boolean;
}
export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
}
export class UpdateTaskStatusDto { @IsEnum(TaskStatus) status: TaskStatus; }

export class CreateMeetingDto {
  @IsString() @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(5000) agenda?: string;
  @IsDateString() startTime: string;
  @IsOptional() @IsDateString() endTime?: string;
  @IsOptional() @IsString() @MaxLength(100) location?: string;
  @IsOptional() @IsString() @MaxLength(500) meetingLink?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) participants?: string[];
  @IsOptional() @IsString() @MaxLength(20_000) minutes?: string;
  @IsOptional() @IsString() @MaxLength(20) status?: string;
}
export class UpdateMeetingDto extends PartialType(CreateMeetingDto) {}
