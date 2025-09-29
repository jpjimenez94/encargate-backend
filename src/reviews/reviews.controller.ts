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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.CLIENTE)
  @ApiOperation({ summary: 'Crear nueva reseña' })
  @ApiResponse({ status: 201, description: 'Reseña creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Pedido no válido para calificar' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  create(@Body() createReviewDto: CreateReviewDto, @Request() req) {
    return this.reviewsService.create(createReviewDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las reseñas' })
  @ApiResponse({ status: 200, description: 'Lista de reseñas' })
  @ApiQuery({ name: 'encargadoId', required: false })
  findAll(@Query('encargadoId') encargadoId?: string) {
    return this.reviewsService.findAll(encargadoId);
  }

  @Get('stats/:encargadoId')
  @ApiOperation({ summary: 'Obtener estadísticas de reseñas de un encargado' })
  @ApiResponse({ status: 200, description: 'Estadísticas de reseñas' })
  getStats(@Param('encargadoId') encargadoId: string) {
    return this.reviewsService.getReviewStats(encargadoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener reseña por ID' })
  @ApiResponse({ status: 200, description: 'Reseña encontrada' })
  @ApiResponse({ status: 404, description: 'Reseña no encontrada' })
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.CLIENTE)
  @ApiOperation({ summary: 'Actualizar reseña' })
  @ApiResponse({ status: 200, description: 'Reseña actualizada' })
  @ApiResponse({ status: 404, description: 'Reseña no encontrada' })
  @ApiResponse({ status: 400, description: 'Sin permisos para editar' })
  update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto, @Request() req) {
    return this.reviewsService.update(id, updateReviewDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.CLIENTE)
  @ApiOperation({ summary: 'Eliminar reseña' })
  @ApiResponse({ status: 200, description: 'Reseña eliminada' })
  @ApiResponse({ status: 404, description: 'Reseña no encontrada' })
  @ApiResponse({ status: 400, description: 'Sin permisos para eliminar' })
  remove(@Param('id') id: string, @Request() req) {
    return this.reviewsService.remove(id, req.user.id);
  }
}
