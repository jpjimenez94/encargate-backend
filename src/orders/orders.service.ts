import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus } from '@prisma/client';
import { EncargadosService } from '../encargados/encargados.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private encargadosService: EncargadosService,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: string) {
    // Verificar que el encargado existe y está disponible
    const encargado = await this.prisma.encargado.findUnique({
      where: { id: createOrderDto.encargadoId },
    });

    if (!encargado) {
      throw new NotFoundException('Encargado no encontrado');
    }

    if (!encargado.available) {
      throw new BadRequestException('El encargado no está disponible');
    }

    return this.prisma.order.create({
      data: {
        ...createOrderDto,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        encargado: {
          select: {
            id: true,
            name: true,
            avatar: true,
            service: true,
            rating: true,
          },
        },
        category: true,
      },
    });
  }

  async findAll(userId?: string, encargadoId?: string, status?: OrderStatus) {
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (encargadoId) {
      where.encargadoId = encargadoId;
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        encargado: {
          select: {
            id: true,
            name: true,
            avatar: true,
            service: true,
            rating: true,
          },
        },
        category: true,
        review: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            phone: true,
          },
        },
        encargado: {
          select: {
            id: true,
            name: true,
            avatar: true,
            service: true,
            rating: true,
          },
        },
        category: true,
        review: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return order;
  }

  async updateStatus(id: string, status: OrderStatus, userId: string, userRole: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    // Verificar permisos según el rol
    if (userRole === 'ENCARGADO') {
      // El encargado puede cambiar estados de sus pedidos asignados
      if (order.encargadoId !== userId) {
        throw new BadRequestException('No tienes permisos para actualizar este pedido');
      }
      // Encargados pueden: PENDING -> CONFIRMED/CANCELLED, CONFIRMED/IN_PROGRESS -> COMPLETED
    } else if (userRole === 'CLIENTE') {
      // El cliente puede cancelar sus propios pedidos si están pendientes
      if (order.userId !== userId) {
        throw new BadRequestException('No tienes permisos para actualizar este pedido');
      }
      if (status !== OrderStatus.CANCELLED || order.status !== OrderStatus.PENDING) {
        throw new BadRequestException('Solo puedes cancelar pedidos pendientes');
      }
    } else {
      throw new BadRequestException('Rol no autorizado');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        encargado: {
          select: {
            id: true,
            name: true,
            avatar: true,
            service: true,
            rating: true,
          },
        },
        category: true,
      },
    });

    // Si el pedido se completa, actualizar el rating del encargado
    if (status === OrderStatus.COMPLETED) {
      await this.encargadosService.updateRating(order.encargadoId);
    }

    return updatedOrder;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: updateOrderDto,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        encargado: {
          select: {
            id: true,
            name: true,
            avatar: true,
            service: true,
            rating: true,
          },
        },
        category: true,
      },
    });

    // Si el pedido se completa, actualizar el rating del encargado
    if (updateOrderDto.status === OrderStatus.COMPLETED) {
      await this.encargadosService.updateRating(order.encargadoId);
    }

    return updatedOrder;
  }

  async remove(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return this.prisma.order.delete({
      where: { id },
    });
  }

  async getOrderStats(encargadoId?: string, userId?: string) {
    const where: any = {};

    if (encargadoId) {
      where.encargadoId = encargadoId;
    }

    if (userId) {
      where.userId = userId;
    }

    const [total, pending, inProgress, completed, cancelled] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.count({ where: { ...where, status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { ...where, status: OrderStatus.IN_PROGRESS } }),
      this.prisma.order.count({ where: { ...where, status: OrderStatus.COMPLETED } }),
      this.prisma.order.count({ where: { ...where, status: OrderStatus.CANCELLED } }),
    ]);

    const totalEarnings = await this.prisma.order.aggregate({
      where: { ...where, status: OrderStatus.COMPLETED },
      _sum: {
        price: true,
      },
    });

    return {
      total,
      pending,
      inProgress,
      completed,
      cancelled,
      totalEarnings: totalEarnings._sum.price || 0,
    };
  }

  async addReview(orderId: string, rating: number, comment: string, userId: string) {
    // Verificar que el pedido existe y pertenece al usuario
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { review: true }
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (order.userId !== userId) {
      throw new BadRequestException('No tienes permisos para calificar este pedido');
    }

    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException('Solo puedes calificar pedidos completados');
    }

    if (order.review) {
      throw new BadRequestException('Este pedido ya tiene una calificación');
    }

    // Crear la reseña
    const review = await this.prisma.review.create({
      data: {
        orderId,
        userId,
        encargadoId: order.encargadoId,
        rating,
        comment: comment || null,
      },
    });

    // Actualizar el rating del encargado
    await this.encargadosService.updateRating(order.encargadoId);

    return review;
  }
}
