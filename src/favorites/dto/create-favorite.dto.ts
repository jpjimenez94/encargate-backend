import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFavoriteDto {
  @ApiProperty({ example: 'encargado-uuid' })
  @IsString()
  encargadoId: string;
}
