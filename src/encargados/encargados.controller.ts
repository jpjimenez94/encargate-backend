import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EncargadosService } from './encargados.service';
import { UpdateEncargadoDto } from './dto/update-encargado.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('encargados')
@Controller('encargados')
export class EncargadosController {
  constructor(private readonly encargadosService: EncargadosService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los encargados' })
  @ApiResponse({ status: 200, description: 'Lista de encargados' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filtrar por categoría' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nombre, servicio o descripción' })
  @ApiQuery({ name: 'service', required: false, description: 'Filtrar por servicio específico' })
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('service') service?: string,
    @Query('available') available?: boolean,
    @Query('sortBy') sortBy?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    // Usar category si está presente, sino usar categoryId para compatibilidad
    const finalCategoryId = category || categoryId;
    return this.encargadosService.findAll(finalCategoryId, search, available, sortBy, limit, offset, service);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ENCARGADO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del encargado autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil del encargado' })
  getProfile(@Request() req) {
    return this.encargadosService.findOne(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener encargado por ID' })
  @ApiResponse({ status: 200, description: 'Encargado encontrado' })
  @ApiResponse({ status: 404, description: 'Encargado no encontrado' })
  findOne(@Param('id') id: string) {
    return this.encargadosService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ENCARGADO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar perfil completo del encargado' })
  @ApiResponse({ status: 200, description: 'Perfil del encargado actualizado' })
  @ApiResponse({ status: 404, description: 'Encargado no encontrado' })
  @ApiResponse({ status: 403, description: 'No autorizado para actualizar este perfil' })
  updateProfile(@Param('id') id: string, @Body() updateEncargadoDto: UpdateEncargadoDto, @Request() req) {
    // Verificar que el encargado solo pueda actualizar su propio perfil
    if (req.user.id !== id) {
      throw new ForbiddenException('No autorizado para actualizar este perfil');
    }
    return this.encargadosService.update(id, updateEncargadoDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar encargado' })
  @ApiResponse({ status: 200, description: 'Encargado actualizado' })
  @ApiResponse({ status: 404, description: 'Encargado no encontrado' })
  update(@Param('id') id: string, @Body() updateEncargadoDto: UpdateEncargadoDto) {
    return this.encargadosService.update(id, updateEncargadoDto);
  }

  @Patch(':id/toggle-availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ENCARGADO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar disponibilidad del encargado' })
  @ApiResponse({ status: 200, description: 'Disponibilidad actualizada' })
  @ApiResponse({ status: 404, description: 'Encargado no encontrado' })
  toggleAvailability(@Param('id') id: string) {
    return this.encargadosService.toggleAvailability(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ENCARGADO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar encargado' })
  @ApiResponse({ status: 200, description: 'Encargado eliminado' })
  @ApiResponse({ status: 404, description: 'Encargado no encontrado' })
  remove(@Param('id') id: string) {
    return this.encargadosService.remove(id);
  }
}
