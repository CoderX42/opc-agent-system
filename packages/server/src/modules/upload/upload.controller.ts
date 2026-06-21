import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest, Response } from 'express';
import { mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

interface AuthenticatedRequest {
  user: { id: string };
}

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
  'text/plain',
  'text/csv',
]);

@ApiTags('Upload')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly config: ConfigService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req: ExpressRequest, _file, callback) => {
          const userId = (req.user as { id?: string } | undefined)?.id;
          if (!userId) return callback(new Error('未认证'), '');
          const directory = resolve(process.env.UPLOAD_DIR || 'uploads', userId);
          mkdirSync(directory, { recursive: true });
          callback(null, directory);
        },
        filename: (_req, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        callback(null, allowedMimeTypes.has(file.mimetype));
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('文件类型不受支持或未提供文件');
    return {
      id: file.filename,
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/api/upload/${file.filename}`,
    };
  }

  @Get(':filename')
  download(
    @Request() req: AuthenticatedRequest,
    @Param('filename') filename: string,
    @Res() response: Response,
  ) {
    const filePath = this.userFilePath(req.user.id, filename);
    if (!existsSync(filePath)) throw new NotFoundException('文件不存在');
    return response.sendFile(filePath);
  }

  @Delete(':filename')
  remove(@Request() req: AuthenticatedRequest, @Param('filename') filename: string) {
    const filePath = this.userFilePath(req.user.id, filename);
    if (!existsSync(filePath)) throw new NotFoundException('文件不存在');
    unlinkSync(filePath);
    return null;
  }

  private userFilePath(userId: string, filename: string): string {
    if (basename(filename) !== filename) throw new BadRequestException('非法文件名');
    return join(resolve(this.config.get('UPLOAD_DIR', 'uploads'), userId), filename);
  }
}
