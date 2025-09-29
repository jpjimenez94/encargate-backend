import { IsString, IsNumber, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ example: 'encargado-uuid' })
  @IsString()
  encargadoId: string;

  @ApiProperty({ example: 'hogar' })
  @IsString()
  categoryId: string;

  @ApiProperty({ example: 'Reparación de tubería' })
  @IsString()
  service: string;

  @ApiProperty({ required: false, example: 'Reparación urgente en la cocina' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Calle 123 #45-67, Bogotá' })
  @IsString()
  address: string;

  @ApiProperty({ example: '2024-12-01T10:00:00Z' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '10:00 AM' })
  @IsString()
  time: string;

  @ApiProperty({ example: 150.50 })
  @IsNumber()
  price: number;

  @ApiProperty({ required: false, example: 'tarjeta' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
