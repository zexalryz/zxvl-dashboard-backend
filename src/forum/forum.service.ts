import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class ForumService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Categories ──────────────────────────────────────

  async listCategories() {
    return this.prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { posts: true } } },
    });
  }

  async getCategoryBySlug(slug: string) {
    const cat = await this.prisma.category.findUnique({ where: { slug } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Category slug already exists');
    return this.prisma.category.create({ data: dto });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    if (dto.slug && dto.slug !== cat.slug) {
      const existing = await this.prisma.category.findUnique({ where: { slug: dto.slug } });
      if (existing) throw new ConflictException('Category slug already exists');
    }
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async deleteCategory(id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted' };
  }

  // ─── Tags ─────────────────────────────────────────────

  async listTags() {
    return this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: true } } },
    });
  }

  async createTag(dto: CreateTagDto) {
    const existing = await this.prisma.tag.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Tag already exists');
    return this.prisma.tag.create({ data: { name: dto.name } });
  }

  async findOrCreateTags(names: string[]) {
    const tags = await Promise.all(
      names.map(async (name) => {
        const lower = name.toLowerCase().trim();
        return this.prisma.tag.upsert({
          where: { name: lower },
          update: {},
          create: { name: lower },
        });
      }),
    );
    return tags;
  }
}
