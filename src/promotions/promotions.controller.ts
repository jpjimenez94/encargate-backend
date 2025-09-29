import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ENCARGADO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear nueva promoción' })
  @ApiResponse({ status: 201, description: 'Promoción creada exitosamente' })
  create(@Body() createPromotionDto: CreatePromotionDto) {
    return this.promotionsService.create(createPromotionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las promociones' })
  @ApiResponse({ status: 200, description: 'Lista de promociones' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  findAll(
    @Query('category') category?: string,
    @Query('active') active?: string,
  ) {
    const isActive = active === 'true' ? true : active === 'false' ? false : undefined;
    return this.promotionsService.findAll(category, isActive);
  }

  @Get('active')
  @ApiOperation({ summary: 'Obtener promociones activas y válidas' })
  @ApiResponse({ status: 200, description: 'Lista de promociones activas' })
  findActive() {
    return this.promotionsService.findActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener promoción por ID' })
  @ApiResponse({ status: 200, description: 'Promoción encontrada' })
  @ApiResponse({ status: 404, description: 'Promoción no encontrada' })
  findOne(@Param('id') id: string) {
    return this.promotionsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ENCARGADO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar promoción' })
  @ApiResponse({ status: 200, description: 'Promoción actualizada' })
  @ApiResponse({ status: 404, description: 'Promoción no encontrada' })
  update(@Param('id') id: string, @Body() updatePromotionDto: UpdatePromotionDto) {
    return this.promotionsService.update(id, updatePromotionDto);
  }

  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ENCARGADO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activar/desactivar promoción' })
  @ApiResponse({ status: 200, description: 'Estado de promoción actualizado' })
  @ApiResponse({ status: 404, description: 'Promoción no encontrada' })
  toggleActive(@Param('id') id: string) {
    return this.promotionsService.toggleActive(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ENCARGADO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar promoción' })
  @ApiResponse({ status: 200, description: 'Promoción eliminada' })
  @ApiResponse({ status: 404, description: 'Promoción no encontrada' })
  remove(@Param('id') id: string) {
    return this.promotionsService.remove(id);
  }
}
