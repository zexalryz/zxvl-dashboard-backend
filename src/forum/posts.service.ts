import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostsDto } from './dto/query-posts.dto';
import { ForumService } from './forum.service';
import { Role } from '../common/constants/role';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly forum: ForumService,
  ) {}

  private include = {
    author: { select: { id: true, username: true, role: true } },
    category: { select: { id: true, name: true, slug: true } },
    tags: { include: { tag: { select: { id: true, name: true } } } },
    _count: { select: { comments: true, reactions: true } },
    reactions: {
      select: { type: true, userId: true },
    },
  };

  async findAll(query: QueryPostsDto, currentUserId?: string) {
    const { categorySlug, tag, search, skip = 0, take = 20 } = query;

    const where: any = {};
    if (categorySlug) {
      const cat = await this.prisma.category.findUnique({ where: { slug: categorySlug } });
      if (!cat) throw new NotFoundException('Category not found');
      where.categoryId = cat.id;
    }
    if (tag) {
      where.tags = { some: { tag: { name: tag } } };
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: Math.min(take, 100),
        include: this.include,
      }),
      this.prisma.post.count({ where }),
    ]);

    const mapped = posts.map((p) => ({
      ...p,
      tags: p.tags.map((t) => t.tag),
      reactionCounts: this.groupReactions(p.reactions),
      userReaction: currentUserId
        ? p.reactions.find((r) => r.userId === currentUserId)?.type ?? null
        : null,
      reactions: undefined,
    }));

    return { posts: mapped, total, skip, take };
  }

  async findById(id: string, currentUserId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        ...this.include,
        comments: {
          where: { parentId: null },
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, username: true, role: true } },
            replies: {
              orderBy: { createdAt: 'asc' },
              include: {
                author: { select: { id: true, username: true, role: true } },
              },
            },
          },
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');

    return {
      ...post,
      tags: post.tags.map((t) => t.tag),
      reactionCounts: this.groupReactions(post.reactions),
      userReaction: currentUserId
        ? post.reactions.find((r) => r.userId === currentUserId)?.type ?? null
        : null,
      reactions: undefined,
    };
  }

  async create(userId: string, dto: CreatePostDto) {
    const cat = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!cat) throw new NotFoundException('Category not found');

    let tagConnects: { tag: { connect: { id: string } } }[] | undefined;
    if (dto.tagNames && dto.tagNames.length > 0) {
      const tags = await this.forum.findOrCreateTags(dto.tagNames);
      tagConnects = tags.map((t) => ({ tag: { connect: { id: t.id } } }));
    }

    return this.prisma.post.create({
      data: {
        title: dto.title,
        content: dto.content,
        authorId: userId,
        categoryId: dto.categoryId,
        tags: tagConnects ? { create: tagConnects } : undefined,
      },
      include: this.include,
    });
  }

  async update(id: string, userId: string, userRole: string, dto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: { tags: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId && userRole !== Role.ADMIN && userRole !== Role.MODERATOR) {
      throw new ForbiddenException('Not authorized to edit this post');
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;

    if (dto.tagNames !== undefined) {
      const tags = await this.forum.findOrCreateTags(dto.tagNames);
      await this.prisma.tagOnPost.deleteMany({ where: { postId: id } });
      await this.prisma.tagOnPost.createMany({
        data: tags.map((t) => ({ postId: id, tagId: t.id })),
      });
    }

    return this.prisma.post.update({
      where: { id },
      data,
      include: this.include,
    });
  }

  async delete(id: string, userId: string, userRole: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId && userRole !== Role.ADMIN && userRole !== Role.MODERATOR) {
      throw new ForbiddenException('Not authorized to delete this post');
    }
    await this.prisma.post.delete({ where: { id } });
    return { message: 'Post deleted' };
  }

  async togglePin(id: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    return this.prisma.post.update({
      where: { id },
      data: { pinned: !post.pinned },
      select: { id: true, pinned: true },
    });
  }

  async toggleLock(id: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    return this.prisma.post.update({
      where: { id },
      data: { locked: !post.locked },
      select: { id: true, locked: true },
    });
  }

  private groupReactions(reactions: { type: string; userId: string }[]) {
    const counts: Record<string, number> = {};
    for (const r of reactions) {
      counts[r.type] = (counts[r.type] || 0) + 1;
    }
    return counts;
  }
}
