import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ example: 'help' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
