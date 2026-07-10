import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReactionsService } from './reactions.service';
import { ToggleReactionDto } from './dto/toggle-reaction.dto';
import { Public } from '../auth/public.decorator';

@ApiTags('Forum - Reactions')
@Controller('posts/:postId/reactions')
export class ReactionsController {
  constructor(private readonly reactions: ReactionsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get reaction counts for a post' })
  list(@Param('postId') postId: string) {
    return this.reactions.findByPost(postId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle reaction on a post [auth]' })
  toggle(@Param('postId') postId: string, @Req() req: any, @Body() dto: ToggleReactionDto) {
    return this.reactions.toggle(req.user.id, postId, dto);
  }
}
