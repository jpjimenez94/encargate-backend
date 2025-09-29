import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'juan@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: Role, example: Role.CLIENTE })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ required: false, example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ required: false, example: '+57 300 123 4567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, example: 'Bogotá, Colombia' })
  @IsOptional()
  @IsString()
  location?: string;

  // Campos específicos para encargados
  @ApiProperty({ required: false, example: 'hogar' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false, example: 'Plomería' })
  @IsOptional()
  @IsString()
  service?: string;

  @ApiProperty({ required: false, example: 100 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ required: false, example: 50 })
  @IsOptional()
  @IsNumber()
  priceMin?: number;

  @ApiProperty({ required: false, example: 200 })
  @IsOptional()
  @IsNumber()
  priceMax?: number;

  @ApiProperty({ required: false, example: '5 años' })
  @IsOptional()
  @IsString()
  experience?: string;

  @ApiProperty({ required: false, example: 'Especialista en reparaciones' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, example: ['Reparación', 'Instalación'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];

  @ApiProperty({ required: false, example: ['hogar', 'tecnologia'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
}
