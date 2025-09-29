import { IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'hogar' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'Hogar' })
  @IsString()
  name: string;

  @ApiProperty({ example: '🏠' })
  @IsString()
  icon: string;

  @ApiProperty({ example: '#8B5CF6' })
  @IsString()
  color: string;

  @ApiProperty({ example: 'Servicios para el hogar' })
  @IsString()
  description: string;

  @ApiProperty({ example: ['Limpieza', 'Plomería', 'Electricidad'] })
  @IsArray()
  @IsString({ each: true })
  services: string[];
}
