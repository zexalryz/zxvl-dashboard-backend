import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ToggleReactionDto } from './dto/toggle-reaction.dto';

@Injectable()
export class ReactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async toggle(userId: string, postId: string, dto: ToggleReactionDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.prisma.reaction.findUnique({
      where: { userId_postId_type: { userId, postId, type: dto.type } },
    });

    if (existing) {
      await this.prisma.reaction.delete({ where: { id: existing.id } });
      return { action: 'removed', type: dto.type };
    }

    await this.prisma.reaction.create({
      data: { type: dto.type, userId, postId },
    });
    return { action: 'added', type: dto.type };
  }

  async findByPost(postId: string) {
    const reactions = await this.prisma.reaction.findMany({
      where: { postId },
      select: { type: true, userId: true },
    });

    const counts: Record<string, number> = {};
    for (const r of reactions) {
      counts[r.type] = (counts[r.type] || 0) + 1;
    }
    return { counts, total: reactions.length };
  }
}
