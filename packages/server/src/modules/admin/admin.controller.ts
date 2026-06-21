import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateMeetingDto, CreateScheduleDto, UpdateMeetingDto, UpdateScheduleDto, UpdateTaskDto, UpdateTaskStatusDto } from './dto/admin.dto';
import { TaskPriority, TaskStatus } from './entities/task.entity';

type AuthRequest = { user: { id: string } };
@ApiTags('Admin') @ApiBearerAuth('JWT') @Controller('admin') @UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Post('schedules') createSchedule(@Request() r: AuthRequest, @Body() d: CreateScheduleDto) { return this.service.createSchedule(r.user.id, d); }
  @Get('schedules') schedules(@Request() r: AuthRequest, @Query('page') p = 1, @Query('limit') l = 10) { return this.service.findAllSchedules(r.user.id, p, l); }
  @Get('schedules/:id') schedule(@Request() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.findOneSchedule(r.user.id, id); }
  @Patch('schedules/:id') updateSchedule(@Request() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() d: UpdateScheduleDto) { return this.service.updateSchedule(r.user.id, id, d); }
  @Delete('schedules/:id') async removeSchedule(@Request() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { await this.service.removeSchedule(r.user.id, id); return null; }

  @Post('tasks') createTask(@Request() r: AuthRequest, @Body() d: CreateTaskDto) { return this.service.createTask(r.user.id, d); }
  @Get('tasks') tasks(@Request() r: AuthRequest, @Query('page') p = 1, @Query('limit') l = 10, @Query('status') s?: TaskStatus, @Query('priority') priority?: TaskPriority) { return this.service.findAllTasks(r.user.id, p, l, s, priority); }
  @Get('tasks/:id') task(@Request() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.findOneTask(r.user.id, id); }
  @Patch('tasks/:id') updateTask(@Request() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() d: UpdateTaskDto) { return this.service.updateTask(r.user.id, id, d); }
  @Patch('tasks/:id/status') taskStatus(@Request() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() d: UpdateTaskStatusDto) { return this.service.updateTaskStatus(r.user.id, id, d.status); }
  @Delete('tasks/:id') async removeTask(@Request() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { await this.service.removeTask(r.user.id, id); return null; }

  @Post('meeting-minutes') createMeeting(@Request() r: AuthRequest, @Body() d: CreateMeetingDto) { return this.service.createMeeting(r.user.id, d); }
  @Get('meeting-minutes') meetings(@Request() r: AuthRequest, @Query('page') p = 1, @Query('limit') l = 10) { return this.service.findAllMeetings(r.user.id, p, l); }
  @Get('meeting-minutes/:id') meeting(@Request() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.findOneMeeting(r.user.id, id); }
  @Patch('meeting-minutes/:id') updateMeeting(@Request() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() d: UpdateMeetingDto) { return this.service.updateMeeting(r.user.id, id, d); }
  @Delete('meeting-minutes/:id') async removeMeeting(@Request() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { await this.service.removeMeeting(r.user.id, id); return null; }
  @Get('overview') overview(@Request() r: AuthRequest) { return this.service.getAdminStats(r.user.id); }
  @Get('stats') stats(@Request() r: AuthRequest) { return this.service.getAdminStats(r.user.id); }
}
