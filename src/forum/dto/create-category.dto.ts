import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'General Discussion' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'general' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: 'General discussion about anything', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({ example: '💬', required: false, default: '📁' })
  @IsOptional()
  @IsString()
  icon?: string;
}
