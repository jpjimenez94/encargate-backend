import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WompiService {
  private readonly apiUrl: string;
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly eventsSecret: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.apiUrl = this.config.get('WOMPI_API_URL') || 'https://sandbox.wompi.co/v1';
    this.publicKey = this.config.get('WOMPI_PUBLIC_KEY') || '';
    this.privateKey = this.config.get('WOMPI_PRIVATE_KEY') || '';
    this.eventsSecret = this.config.get('WOMPI_EVENTS_SECRET') || '';
  }

  /**
   * Verificar estado de transacción
   */
  async getTransaction(transactionId: string) {
    try {
      const response = await fetch(`${this.apiUrl}/transactions/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${this.publicKey}`,
        },
      });

      const data = await response.json();
      
      if (data.data) {
        return data.data;
      }
      
      throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
    } catch (error) {
      throw new HttpException(
        'Error fetching transaction',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Webhook handler para eventos de Wompi
   */
  async handleWebhook(signature: string, payload: any) {
    try {
      // Verificar firma del webhook
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha256', this.eventsSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (hash !== signature) {
        throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
      }

      const event = payload.event;
      const transaction = payload.data.transaction;

      // Procesar según el tipo de evento
      if (event === 'transaction.updated') {
        await this.handleTransactionUpdate(transaction);
      }

      return { received: true };
    } catch (error) {
      throw new HttpException(
        'Webhook processing error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Manejar actualización de transacción
   */
  private async handleTransactionUpdate(transaction: any) {
    const orderId = transaction.reference;
    const status = transaction.status;

    if (status === 'APPROVED') {
      // Actualizar pedido como pagado y aceptado
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'PAID',
          paymentIntentId: transaction.id,
          status: 'ACCEPTED', // Confirmar el pedido
        },
      });
    } else if (status === 'DECLINED' || status === 'ERROR') {
      // Marcar pago como fallido
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'FAILED',
          paymentIntentId: transaction.id,
        },
      });
    }
  }

  /**
   * Verificar y actualizar estado de pago
   */
  async verifyAndUpdatePayment(orderId: string, transactionId: string) {
    try {
      const transaction = await this.getTransaction(transactionId);
      
      if (transaction.status === 'APPROVED') {
        await this.prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'PAID',
            paymentIntentId: transactionId,
            status: 'ACCEPTED',
          },
        });
        
        return { success: true, status: 'APPROVED' };
      }
      
      return { success: false, status: transaction.status };
    } catch (error) {
      throw new HttpException(
        'Error verifying payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
