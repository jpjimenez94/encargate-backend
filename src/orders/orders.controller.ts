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
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, OrderStatus } from '@prisma/client';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.CLIENTE)
  @ApiOperation({ summary: 'Crear nuevo pedido' })
  @ApiResponse({ status: 201, description: 'Pedido creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Encargado no disponible' })
  @ApiResponse({ status: 404, description: 'Encargado no encontrado' })
  create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    return this.ordersService.create(createOrderDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los pedidos' })
  @ApiResponse({ status: 200, description: 'Lista de pedidos' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'encargadoId', required: false })
  findAll(
    @Request() req,
    @Query('status') status?: OrderStatus,
    @Query('encargadoId') encargadoId?: string,
  ) {
    // Si es cliente, solo ver sus pedidos
    // Si es encargado, solo ver pedidos asignados a él
    const userId = req.user.role === Role.CLIENTE ? req.user.id : undefined;
    const providerId = req.user.role === Role.ENCARGADO ? req.user.id : encargadoId;

    return this.ordersService.findAll(userId, providerId, status);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de pedidos' })
  @ApiResponse({ status: 200, description: 'Estadísticas de pedidos' })
  getStats(@Request() req) {
    const userId = req.user.role === Role.CLIENTE ? req.user.id : undefined;
    const encargadoId = req.user.role === Role.ENCARGADO ? req.user.id : undefined;

    return this.ordersService.getOrderStats(encargadoId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener pedido por ID' })
  @ApiResponse({ status: 200, description: 'Pedido encontrado' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar estado del pedido' })
  @ApiResponse({ status: 200, description: 'Estado del pedido actualizado' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  updateStatus(
    @Param('id') id: string, 
    @Body() body: { status: OrderStatus },
    @Request() req
  ) {
    return this.ordersService.updateStatus(id, body.status, req.user.id, req.user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar pedido' })
  @ApiResponse({ status: 200, description: 'Pedido actualizado' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Post(':id/review')
  @UseGuards(RolesGuard)
  @Roles(Role.CLIENTE)
  @ApiOperation({ summary: 'Agregar reseña al pedido' })
  @ApiResponse({ status: 201, description: 'Reseña agregada exitosamente' })
  @ApiResponse({ status: 400, description: 'Pedido no completado o ya tiene reseña' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  addReview(
    @Param('id') id: string,
    @Body() body: { rating: number; comment?: string },
    @Request() req
  ) {
    return this.ordersService.addReview(id, body.rating, body.comment, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar pedido' })
  @ApiResponse({ status: 200, description: 'Pedido eliminado' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
