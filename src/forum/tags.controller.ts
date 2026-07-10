import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ForumService } from './forum.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { Public } from '../auth/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/role';

@ApiTags('Forum - Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly forum: ForumService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all tags' })
  list() {
    return this.forum.listTags();
  }

  @Post()
  @Roles(Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a tag [MOD/ADMIN]' })
  create(@Body() dto: CreateTagDto) {
    return this.forum.createTag(dto);
  }
}
