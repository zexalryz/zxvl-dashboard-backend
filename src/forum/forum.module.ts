import { Module } from '@nestjs/common';
import { ForumService } from './forum.service';
import { PostsService } from './posts.service';
import { CommentsService } from './comments.service';
import { ReactionsService } from './reactions.service';
import { CategoriesController } from './categories.controller';
import { TagsController } from './tags.controller';
import { PostsController } from './posts.controller';
import { CommentsController } from './comments.controller';
import { ReactionsController } from './reactions.controller';

@Module({
  controllers: [
    CategoriesController,
    TagsController,
    PostsController,
    CommentsController,
    ReactionsController,
  ],
  providers: [
    ForumService,
    PostsService,
    CommentsService,
    ReactionsService,
  ],
})
export class ForumModule {}
