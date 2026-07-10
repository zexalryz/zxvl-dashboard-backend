import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateToolDto } from './dto/create-tool.dto';
import { UpdateToolDto } from './dto/update-tool.dto';

@Injectable()
export class ToolsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tool.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async findOne(id: string) {
    const tool = await this.prisma.tool.findUnique({ where: { id } });
    if (!tool) throw new NotFoundException('Tool not found');
    return tool;
  }

  async create(dto: CreateToolDto) {
    return this.prisma.tool.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        description: dto.description ?? '',
        icon: dto.icon ?? '🔧',
        enabled: dto.enabled ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateToolDto) {
    await this.findOne(id);
    return this.prisma.tool.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tool.delete({ where: { id } });
  }
}
