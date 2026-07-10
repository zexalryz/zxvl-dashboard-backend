import { IsString, MinLength, MaxLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateToolDto {
  @ApiProperty({ description: 'Unique slug', example: 'rest-api-tester' })
  @IsString() @MinLength(1) @MaxLength(50)
  slug: string;

  @ApiProperty({ description: 'Display name', example: 'REST API Tester' })
  @IsString() @MinLength(1) @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Short description' })
  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Emoji icon', default: '🔧' })
  @IsOptional() @IsString() @MaxLength(10)
  icon?: string;

  @ApiPropertyOptional({ description: 'Whether the tool is enabled', default: false })
  @IsOptional() @IsBoolean()
  enabled?: boolean;
}
