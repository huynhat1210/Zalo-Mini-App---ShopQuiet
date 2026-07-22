import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MediaService {
  private readonly uploadsDir = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'public',
    'uploads',
  );

  constructor() {
    // Ensure directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async findAll() {
    try {
      const files = fs.readdirSync(this.uploadsDir);
      return files
        .filter((file) => {
          const stat = fs.statSync(path.join(this.uploadsDir, file));
          return stat.isFile() && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file);
        })
        .map((file) => {
          const stat = fs.statSync(path.join(this.uploadsDir, file));
          return {
            filename: file,
            size: stat.size,
            url: `/uploads/${file}`,
            createdAt: stat.birthtime,
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (e) {
      return [];
    }
  }

  async delete(filename: string) {
    const filePath = path.join(this.uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Không tìm thấy file hình ảnh!');
    }
    fs.unlinkSync(filePath);
    return { success: true };
  }
}
