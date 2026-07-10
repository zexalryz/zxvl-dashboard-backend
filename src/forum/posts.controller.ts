import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostsDto } from './dto/query-posts.dto';
import { Public } from '../auth/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/role';

@ApiTags('Forum - Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List posts (paginated, filterable)' })
  list(@Query() query: QueryPostsDto, @Req() req: any) {
    return this.posts.findAll(query, req.user?.id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get post by ID with comments' })
  getById(@Param('id') id: string, @Req() req: any) {
    return this.posts.findById(id, req.user?.id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a post [auth]' })
  create(@Req() req: any, @Body() dto: CreatePostDto) {
    return this.posts.create(req.user.id, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update post [owner/MOD/ADMIN]' })
  update(@Param('id') id: string, @Req() req: any, @Body() dto: UpdatePostDto) {
    return this.posts.update(id, req.user.id, req.user.role, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete post [owner/MOD/ADMIN]' })
  delete(@Param('id') id: string, @Req() req: any) {
    return this.posts.delete(id, req.user.id, req.user.role);
  }

  @Post(':id/pin')
  @Roles(Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle pin post [MOD/ADMIN]' })
  togglePin(@Param('id') id: string) {
    return this.posts.togglePin(id);
  }

  @Post(':id/lock')
  @Roles(Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle lock post [MOD/ADMIN]' })
  toggleLock(@Param('id') id: string) {
    return this.posts.toggleLock(id);
  }
}
