import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ForumService } from './forum.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Public } from '../auth/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/role';

@ApiTags('Forum - Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly forum: ForumService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all categories ordered by position' })
  list() {
    return this.forum.listCategories();
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get category by slug' })
  getBySlug(@Param('slug') slug: string) {
    return this.forum.getCategoryBySlug(slug);
  }

  @Post()
  @Roles(Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category [MOD/ADMIN]' })
  create(@Body() dto: CreateCategoryDto) {
    return this.forum.createCategory(dto);
  }

  @Patch(':id')
  @Roles(Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category [MOD/ADMIN]' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.forum.updateCategory(id, dto);
  }

  @Delete(':id')
  @Roles(Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete category [MOD/ADMIN]' })
  delete(@Param('id') id: string) {
    return this.forum.deleteCategory(id);
  }
}
