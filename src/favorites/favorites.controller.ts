import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLIENTE)
@ApiBearerAuth()
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  @ApiOperation({ summary: 'Agregar encargado a favoritos' })
  @ApiResponse({ status: 201, description: 'Encargado agregado a favoritos' })
  @ApiResponse({ status: 404, description: 'Encargado no encontrado' })
  @ApiResponse({ status: 409, description: 'Ya está en favoritos' })
  create(@Body() createFavoriteDto: CreateFavoriteDto, @Request() req) {
    return this.favoritesService.create(createFavoriteDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener favoritos del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de favoritos' })
  findAll(@Request() req) {
    return this.favoritesService.findAll(req.user.id);
  }

  @Get('check/:encargadoId')
  @ApiOperation({ summary: 'Verificar si un encargado está en favoritos' })
  @ApiResponse({ status: 200, description: 'Estado de favorito' })
  checkFavorite(@Param('encargadoId') encargadoId: string, @Request() req) {
    return this.favoritesService.isFavorite(encargadoId, req.user.id);
  }

  @Post('toggle/:encargadoId')
  @ApiOperation({ summary: 'Alternar favorito (agregar/quitar)' })
  @ApiResponse({ status: 200, description: 'Estado de favorito actualizado' })
  toggle(@Param('encargadoId') encargadoId: string, @Request() req) {
    return this.favoritesService.toggle(encargadoId, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener favorito por ID' })
  @ApiResponse({ status: 200, description: 'Favorito encontrado' })
  @ApiResponse({ status: 404, description: 'Favorito no encontrado' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.favoritesService.findOne(id, req.user.id);
  }

  @Delete(':encargadoId')
  @ApiOperation({ summary: 'Eliminar encargado de favoritos' })
  @ApiResponse({ status: 200, description: 'Favorito eliminado' })
  @ApiResponse({ status: 404, description: 'Favorito no encontrado' })
  remove(@Param('encargadoId') encargadoId: string, @Request() req) {
    return this.favoritesService.remove(encargadoId, req.user.id);
  }
}
