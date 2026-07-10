import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Great post! I agree.' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ required: false, description: 'Parent comment ID for replies' })
  @IsOptional()
  @IsString()
  parentId?: string;
}
