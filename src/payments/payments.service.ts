import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  // Confirmar pago en efectivo
  async confirmCashPayment(orderId: string) {
    try {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { 
          paymentStatus: 'PENDING',
          paymentMethod: 'cash',
        },
      });

      return {
        success: true,
        message: 'Pago en efectivo confirmado',
      };
    } catch (error) {
      throw new Error(`Error confirming cash payment: ${error.message}`);
    }
  }

  // Obtener estado de pago de un pedido
  async getPaymentStatus(orderId: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          paymentStatus: true,
          paymentMethod: true,
          paymentIntentId: true,
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      return order;
    } catch (error) {
      throw new Error(`Error getting payment status: ${error.message}`);
    }
  }
}
