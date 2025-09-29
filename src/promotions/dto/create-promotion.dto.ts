import { IsString, IsNumber, IsBoolean, IsDateString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePromotionDto {
  @ApiProperty({ example: '40% OFF' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Limpieza Profunda' })
  @IsString()
  subtitle: string;

  @ApiProperty({ example: 'Descuento especial en servicios de limpieza' })
  @IsString()
  description: string;

  @ApiProperty({ example: 40, minimum: 1, maximum: 100 })
  @IsNumber()
  @Min(1)
  @Max(100)
  discount: number;

  @ApiProperty({ example: 'hogar' })
  @IsString()
  category: string;

  @ApiProperty({ example: 'purple' })
  @IsString()
  color: string;

  @ApiProperty({ example: 'from-purple-500 to-purple-600' })
  @IsString()
  gradient: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  active: boolean;

  @ApiProperty({ example: '2024-12-31T23:59:59Z' })
  @IsDateString()
  validUntil: string;

  @ApiProperty({ required: false, example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString()
  image?: string;
}
