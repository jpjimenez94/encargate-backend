import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus } from '@prisma/client';
import { EncargadosService } from '../encargados/encargados.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { PricingService } from '../pricing/pricing.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private encargadosService: EncargadosService,
    @Inject(forwardRef(() => NotificationsGateway))
    private notificationsGateway: NotificationsGateway,
    private pricingService: PricingService,
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

    // Si el método de pago es efectivo, marcar como pagado automáticamente
    // porque no requiere procesamiento online
    const paymentStatus = createOrderDto.paymentMethod === 'cash' ? 'PAID' : 'PENDING';
    
    this.logger.log(`💰 Creando pedido con método de pago: ${createOrderDto.paymentMethod}, paymentStatus: ${paymentStatus}`);

    const newOrder = await this.prisma.order.create({
      data: {
        ...createOrderDto,
        userId,
        paymentStatus,
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

    // 🔔 Emitir notificación WebSocket al proveedor sobre nuevo pedido
    this.logger.log(`📤 Emitiendo notificación de nuevo pedido al encargado: ${createOrderDto.encargadoId}`);
    this.notificationsGateway.notifyNewOrder(createOrderDto.encargadoId, newOrder);

    return newOrder;
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
      
      // 🔔 Notificar al cliente que el pedido está completado
      this.logger.log(`📤 Emitiendo notificación de pedido completado al cliente: ${order.userId}`);
      this.notificationsGateway.notifyOrderCompleted(order.userId, updatedOrder);
    }

    // 🔔 Notificar cambio de estado al cliente (para cualquier cambio)
    this.logger.log(`📤 Emitiendo notificación de cambio de estado al cliente: ${order.userId}`);
    this.notificationsGateway.notifyOrderStatusChange(order.userId, updatedOrder);

    // Si el proveedor cambió el estado, también notificar al proveedor
    if (userRole === 'ENCARGADO') {
      this.logger.log(`📤 Emitiendo notificación de cambio de estado al proveedor: ${order.encargadoId}`);
      this.notificationsGateway.notifyOrderStatusChange(order.encargadoId, updatedOrder);
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

    // Obtener todos los pedidos pagados (completados O aceptados con pago confirmado)
    const paidOrders = await this.prisma.order.findMany({
      where: { 
        ...where, 
        OR: [
          { status: OrderStatus.COMPLETED },
          { 
            status: OrderStatus.ACCEPTED, 
            paymentStatus: 'PAID' 
          },
          { 
            status: OrderStatus.IN_PROGRESS, 
            paymentStatus: 'PAID' 
          }
        ]
      },
      select: {
        price: true,
        paymentMethod: true,
        providerEarnings: true, // Valor guardado en BD
        status: true,
      },
    });

    // Calcular ganancias reales del proveedor
    let totalEarnings = 0;
    let usedSaved = 0;
    let calculated = 0;
    
    for (const order of paidOrders) {
      // Priorizar el valor guardado en BD
      if (order.providerEarnings !== null && order.providerEarnings !== undefined) {
        // Usar el valor ya calculado y guardado
        totalEarnings += order.providerEarnings;
        usedSaved++;
      } else {
        // Fallback: calcular dinámicamente para pedidos antiguos
        if (!order.paymentMethod || order.paymentMethod === 'cash') {
          totalEarnings += order.price;
        } else {
          const breakdown = this.pricingService.calculatePricing(order.price);
          totalEarnings += breakdown.providerEarnings;
        }
        calculated++;
      }
    }
    
    this.logger.log(`📊 Ganancias totales: $${Math.round(totalEarnings)} | Pedidos pagados: ${paidOrders.length} (${usedSaved} guardados, ${calculated} calculados)`);

    return {
      total,
      pending,
      inProgress,
      completed,
      cancelled,
      totalEarnings: Math.round(totalEarnings),
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

    // 🔔 Notificar al proveedor sobre la nueva reseña
    this.logger.log(`📤 Emitiendo notificación de nueva reseña al proveedor: ${order.encargadoId}`);
    this.notificationsGateway.notifyNewReview(order.encargadoId, {
      ...review,
      order: {
        id: order.id,
        service: order.service,
      },
    });

    return review;
  }

  /**
   * Obtiene la transacción asociada a un pedido
   */
  async getOrderTransaction(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { paymentIntentId: true }
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (!order.paymentIntentId) {
      throw new NotFoundException('No hay transacción asociada a este pedido');
    }

    return { transactionId: order.paymentIntentId };
  }

  /**
   * Confirma el pago en efectivo de un pedido
   * Marca el pedido como pagado sin necesidad de transacción online
   */
  async confirmCashPayment(orderId: string) {
    this.logger.log(`💵 Confirmando pago en efectivo para pedido: ${orderId}`);
    
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    this.logger.log(`📊 Estado actual del pedido: status=${order.status}, paymentStatus=${order.paymentStatus}, paymentMethod=${order.paymentMethod}`);

    // Actualizar el método de pago a efectivo y marcar como pagado
    // Esto permite cambiar el método de pago de un pedido existente a efectivo
    this.logger.log(`💵 Cambiando método de pago a efectivo y marcando como pagado`);
    
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { 
        paymentStatus: 'PAID',
        paymentMethod: 'cash'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        encargado: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(`✅ Pago en efectivo confirmado para pedido: ${updatedOrder.id}`);
    return updatedOrder;
  }

  /**
   * Confirma el pago de un pedido y actualiza su estado
   * Este método puede ser llamado por el sistema cuando se confirma un pago
   */
  async confirmPayment(orderId: string, transactionId?: string) {
    this.logger.log(`💳 Confirmando pago para pedido: ${orderId}, transactionId: ${transactionId}`);
    
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        encargado: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    this.logger.log(`📊 Estado actual del pedido: status=${order.status}, paymentStatus=${order.paymentStatus}`);

    // Actualizar si el pedido está pendiente o ya aceptado (pero sin pagar)
    if (order.status === OrderStatus.PENDING || (order.status === OrderStatus.ACCEPTED && order.paymentStatus !== 'PAID')) {
      this.logger.log(`✅ Actualizando pedido a ACCEPTED con paymentStatus=PAID`);
      
      // Calcular comisiones y precios finales si es pago digital
      let pricingData = {};
      if (order.paymentMethod && order.paymentMethod !== 'cash') {
        const breakdown = this.pricingService.calculatePricing(order.price);
        pricingData = {
          platformEarnings: breakdown.platformEarnings,
          wompiCost: breakdown.wompiCost,
          totalPrice: breakdown.totalPrice,
          providerEarnings: breakdown.providerEarnings,
        };
        this.logger.log(`💰 Comisiones calculadas: proveedor recibirá $${Math.round(breakdown.providerEarnings)}`);
      }
      
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: { 
          status: OrderStatus.ACCEPTED,
          paymentStatus: 'PAID',
          ...(transactionId && { paymentIntentId: transactionId }),
          ...pricingData, // Guardar valores calculados de comisiones
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          encargado: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(`✅ Pedido actualizado exitosamente: ${updatedOrder.id}`);
      
      // 🔔 Notificar al cliente que el pago fue confirmado
      this.logger.log(`📤 Emitiendo notificación de pago confirmado al cliente: ${updatedOrder.userId}`);
      this.notificationsGateway.notifyPaymentConfirmed(updatedOrder.userId, updatedOrder);
      
      // 🔔 Notificar al proveedor que el pago fue confirmado
      this.logger.log(`📤 Emitiendo notificación de pago confirmado al proveedor: ${updatedOrder.encargadoId}`);
      this.notificationsGateway.notifyPaymentConfirmed(updatedOrder.encargadoId, updatedOrder);
      
      return updatedOrder;
    } else {
      this.logger.log(`ℹ️ Pedido ya está en estado correcto: status=${order.status}, paymentStatus=${order.paymentStatus}`);
    }

    return order;
  }

  /**
   * Cancela un pedido y su pago asociado
   * Puede ser llamado por el cliente para cancelar su propio pedido
   */
  async cancelOrderAndPayment(orderId: string, transactionId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        encargado: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    // Permitir cancelar pedidos en estado PENDING o ACCEPTED
    if (order.status === OrderStatus.PENDING || order.status === OrderStatus.ACCEPTED) {
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: { 
          status: OrderStatus.CANCELLED,
          paymentStatus: 'FAILED', // Marcar pago como fallido
          ...(transactionId && { paymentIntentId: transactionId })
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          encargado: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return updatedOrder;
    } else {
      throw new BadRequestException(`No se puede cancelar el pedido. Estado actual: ${order.status}. Solo se pueden cancelar pedidos PENDING o ACCEPTED.`);
    }
  }

  /**
   * Recalcula las comisiones de todos los pedidos completados que no tienen valores guardados
   */
  async recalculateAllCommissions() {
    this.logger.log('🔄 Iniciando recálculo de comisiones para pedidos completados...');
    
    // Buscar todos los pedidos completados con pago digital pero sin valores de comisiones
    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.COMPLETED,
        paymentMethod: { not: 'cash' },
        providerEarnings: null, // Solo pedidos sin comisiones calculadas
      },
    });

    this.logger.log(`📊 Encontrados ${orders.length} pedidos para recalcular`);

    let updated = 0;
    for (const order of orders) {
      try {
        const breakdown = this.pricingService.calculatePricing(order.price);
        
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            platformEarnings: breakdown.platformEarnings,
            wompiCost: breakdown.wompiCost,
            totalPrice: breakdown.totalPrice,
            providerEarnings: breakdown.providerEarnings,
          },
        });
        
        updated++;
        this.logger.log(`✅ Pedido ${order.id.slice(-8)} actualizado: proveedor recibirá $${Math.round(breakdown.providerEarnings)}`);
      } catch (error) {
        this.logger.error(`❌ Error actualizando pedido ${order.id}:`, error);
      }
    }

    this.logger.log(`✅ Recálculo completado: ${updated}/${orders.length} pedidos actualizados`);

    return {
      message: 'Comisiones recalculadas exitosamente',
      total: orders.length,
      updated,
    };
  }
}
