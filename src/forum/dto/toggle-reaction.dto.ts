import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';

const REACTION_TYPES = ['LIKE', 'LOVE', 'LAUGH', 'CLAP', 'IDEA'] as const;

export class ToggleReactionDto {
  @ApiProperty({ enum: REACTION_TYPES, example: 'LIKE' })
  @IsString()
  @IsIn(REACTION_TYPES)
  type: string;
}
