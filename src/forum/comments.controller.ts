import { Controller, Get, Post, Delete, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Public } from '../auth/public.decorator';

@ApiTags('Forum - Comments')
@Controller('posts/:postId/comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List comments for a post' })
  list(@Param('postId') postId: string) {
    return this.comments.findByPost(postId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a comment [auth]' })
  create(@Param('postId') postId: string, @Req() req: any, @Body() dto: CreateCommentDto) {
    return this.comments.create(req.user.id, postId, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete comment [owner/MOD/ADMIN]' })
  delete(@Param('id') id: string, @Req() req: any) {
    return this.comments.delete(id, req.user.id, req.user.role);
  }
}
