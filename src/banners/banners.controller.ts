import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BannersService } from './banners.service';

@ApiTags('banners')
@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los banners activos' })
  @ApiResponse({ status: 200, description: 'Lista de banners' })
  findAll() {
    return this.bannersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un banner por ID' })
  @ApiResponse({ status: 200, description: 'Banner encontrado' })
  @ApiResponse({ status: 404, description: 'Banner no encontrado' })
  findOne(@Param('id') id: string) {
    return this.bannersService.findOne(id);
  }
}
