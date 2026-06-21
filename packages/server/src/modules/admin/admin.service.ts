import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Schedule } from './entities/schedule.entity';
import { Task, TaskPriority, TaskStatus } from './entities/task.entity';
import { Meeting } from './entities/meeting.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateMeetingDto, CreateScheduleDto, UpdateMeetingDto, UpdateScheduleDto, UpdateTaskDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Schedule) private readonly schedules: Repository<Schedule>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(Meeting) private readonly meetings: Repository<Meeting>,
  ) {}

  async createSchedule(userId: string, dto: CreateScheduleDto) {
    return this.schedules.save(this.schedules.create({ ...dto, startTime: new Date(dto.startTime), endTime: dto.endTime ? new Date(dto.endTime) : undefined, userId }));
  }
  async findAllSchedules(userId: string, page = 1, limit = 10) {
    const p = this.page(page, limit);
    const [items, total] = await this.schedules.findAndCount({ where: { userId }, skip: p.skip, take: p.limit, order: { startTime: 'ASC' } });
    return { items, total, page: p.page, pageSize: p.limit };
  }
  async findOneSchedule(userId: string, id: string) {
    const item = await this.schedules.findOne({ where: { id, userId } });
    if (!item) throw new NotFoundException(`Schedule #${id} not found`);
    return item;
  }
  async updateSchedule(userId: string, id: string, dto: UpdateScheduleDto) {
    const item = await this.findOneSchedule(userId, id);
    const { startTime, endTime, ...values } = dto;
    Object.assign(item, values);
    if (startTime) item.startTime = new Date(startTime);
    if (endTime) item.endTime = new Date(endTime);
    return this.schedules.save(item);
  }
  async removeSchedule(userId: string, id: string) { await this.schedules.remove(await this.findOneSchedule(userId, id)); }

  async createTask(userId: string, dto: CreateTaskDto) {
    return this.tasks.save(this.tasks.create({ ...dto, dueDate: dto.dueDate ? new Date(dto.dueDate) : null, creatorId: userId }));
  }
  async findAllTasks(userId: string, page = 1, limit = 10, status?: TaskStatus, priority?: TaskPriority) {
    const p = this.page(page, limit);
    const query = this.tasks.createQueryBuilder('task').where('task.creatorId = :userId', { userId });
    if (status) query.andWhere('task.status = :status', { status });
    if (priority) query.andWhere('task.priority = :priority', { priority });
    const [items, total] = await query.orderBy('task.createdAt', 'DESC').skip(p.skip).take(p.limit).getManyAndCount();
    return { items, total, page: p.page, pageSize: p.limit };
  }
  async findOneTask(userId: string, id: string) {
    const item = await this.tasks.findOne({ where: { id, creatorId: userId } });
    if (!item) throw new NotFoundException(`Task #${id} not found`);
    return item;
  }
  async updateTask(userId: string, id: string, dto: UpdateTaskDto) {
    const item = await this.findOneTask(userId, id);
    const { dueDate, ...values } = dto;
    Object.assign(item, values);
    if (dueDate) item.dueDate = new Date(dueDate);
    return this.tasks.save(item);
  }
  async updateTaskStatus(userId: string, id: string, status: TaskStatus) { return this.updateTask(userId, id, { status }); }
  async removeTask(userId: string, id: string) { await this.tasks.remove(await this.findOneTask(userId, id)); }

  async createMeeting(userId: string, dto: CreateMeetingDto) {
    return this.meetings.save(this.meetings.create({ ...dto, startTime: new Date(dto.startTime), endTime: dto.endTime ? new Date(dto.endTime) : undefined, organizerId: userId }));
  }
  async findAllMeetings(userId: string, page = 1, limit = 10) {
    const p = this.page(page, limit);
    const [items, total] = await this.meetings.findAndCount({ where: { organizerId: userId }, skip: p.skip, take: p.limit, order: { startTime: 'ASC' } });
    return { items, total, page: p.page, pageSize: p.limit };
  }
  async findOneMeeting(userId: string, id: string) {
    const item = await this.meetings.findOne({ where: { id, organizerId: userId } });
    if (!item) throw new NotFoundException(`Meeting #${id} not found`);
    return item;
  }
  async updateMeeting(userId: string, id: string, dto: UpdateMeetingDto) {
    const item = await this.findOneMeeting(userId, id);
    const { startTime, endTime, ...values } = dto;
    Object.assign(item, values);
    if (startTime) item.startTime = new Date(startTime);
    if (endTime) item.endTime = new Date(endTime);
    return this.meetings.save(item);
  }
  async removeMeeting(userId: string, id: string) { await this.meetings.remove(await this.findOneMeeting(userId, id)); }

  async getAdminStats(userId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const [totalTasks, todoTasks, inProgressTasks, doneTasks, overdueTasks, upcomingMeetings, todaySchedules] = await Promise.all([
      this.tasks.count({ where: { creatorId: userId } }), this.tasks.count({ where: { creatorId: userId, status: TaskStatus.TODO } }),
      this.tasks.count({ where: { creatorId: userId, status: TaskStatus.IN_PROGRESS } }), this.tasks.count({ where: { creatorId: userId, status: TaskStatus.DONE } }),
      this.tasks.count({ where: { creatorId: userId, dueDate: LessThan(today) } }), this.meetings.count({ where: { organizerId: userId, startTime: MoreThanOrEqual(new Date()) } }),
      this.schedules.createQueryBuilder('s').where('s.userId = :userId AND s.startTime >= :today AND s.startTime < :tomorrow', { userId, today, tomorrow }).getCount(),
    ]);
    return { totalTasks, todoTasks, pendingTasks: todoTasks, inProgressTasks, doneTasks, overdueTasks, upcomingMeetings, todaySchedules, weeklyTaskStats: [] };
  }

  private page(page: number, limit: number) { const safePage = Math.max(1, Number(page) || 1); const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10)); return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit }; }
}
