import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly eventsSecret: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway,
  ) {
    this.eventsSecret = this.configService.get<string>('WOMPI_EVENTS_SECRET');
  }

  /**
   * Valida el checksum de seguridad del webhook según documentación de Wompi
   * 
   * Algoritmo:
   * 1. Concatenar los valores de los campos especificados en signature.properties
   * 2. Concatenar el timestamp
   * 3. Concatenar el secreto de eventos
   * 4. Calcular SHA256
   * 5. Comparar con el checksum recibido
   * 
   * Documentación: https://docs.wompi.co/docs/es/eventos#seguridad
   */
  async validateWompiChecksum(event: any, receivedChecksum: string): Promise<boolean> {
    try {
      if (!this.eventsSecret) {
        this.logger.warn('⚠️ WOMPI_EVENTS_SECRET no configurado - validación omitida');
        return true; // En desarrollo permitir sin validación
      }

      if (!receivedChecksum) {
        this.logger.error('❌ No se recibió checksum en el header');
        return false;
      }

      // 1. Extraer las propiedades a concatenar
      const properties = event.signature?.properties || [];
      let concatenated = '';

      for (const property of properties) {
        const value = this.getNestedProperty(event.data, property);
        concatenated += value;
      }

      // 2. Concatenar timestamp
      concatenated += event.timestamp;

      // 3. Concatenar secreto de eventos
      concatenated += this.eventsSecret;

      // 4. Calcular SHA256
      const calculatedChecksum = crypto
        .createHash('sha256')
        .update(concatenated)
        .digest('hex')
        .toUpperCase();

      // 5. Comparar (case-insensitive)
      const isValid = calculatedChecksum === receivedChecksum.toUpperCase();

      if (isValid) {
        this.logger.log('✅ Checksum válido');
      } else {
        this.logger.error('❌ Checksum inválido');
        this.logger.error(`Esperado: ${calculatedChecksum}`);
        this.logger.error(`Recibido: ${receivedChecksum}`);
      }

      return isValid;
    } catch (error) {
      this.logger.error('❌ Error validando checksum:', error);
      return false;
    }
  }

  /**
   * Maneja el evento transaction.updated
   * Se ejecuta cuando una transacción cambia de estado
   */
  async handleTransactionUpdated(event: any): Promise<void> {
    try {
      const transaction = event.data.transaction;
      
      this.logger.log(`💳 Transacción actualizada: ${transaction.id}`);
      this.logger.log(`📊 Estado: ${transaction.status}`);
      this.logger.log(`💰 Monto: $${transaction.amount_in_cents / 100}`);
      this.logger.log(`📧 Email: ${transaction.customer_email}`);
      
      // Buscar el pedido asociado por referencia
      const order = await this.prisma.order.findFirst({
        where: {
          OR: [
            { paymentIntentId: transaction.id },
            { paymentIntentId: transaction.reference },
          ]
        },
        include: {
          user: true,
          encargado: true,
        }
      });

      if (!order) {
        this.logger.warn(`⚠️ No se encontró pedido para transacción ${transaction.id}`);
        return;
      }

      this.logger.log(`📦 Pedido encontrado: ${order.id}`);

      // Actualizar el estado del pedido según el estado de la transacción
      switch (transaction.status) {
        case 'APPROVED':
          await this.handleApprovedTransaction(order, transaction);
          break;

        case 'DECLINED':
        case 'ERROR':
          await this.handleFailedTransaction(order, transaction);
          break;

        case 'PENDING':
          this.logger.log('⏳ Transacción aún pendiente, esperando confirmación');
          break;

        default:
          this.logger.warn(`⚠️ Estado desconocido: ${transaction.status}`);
      }

    } catch (error) {
      this.logger.error('❌ Error manejando transaction.updated:', error);
      throw error;
    }
  }

  /**
   * Maneja una transacción aprobada
   */
  private async handleApprovedTransaction(order: any, transaction: any): Promise<void> {
    try {
      // Actualizar el pedido a ACCEPTED con pago confirmado
      const updatedOrder = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'ACCEPTED',
          paymentStatus: 'PAID',
          paymentIntentId: transaction.id,
        },
        include: {
          user: true,
          encargado: true,
        }
      });

      this.logger.log(`✅ Pedido ${order.id} actualizado a ACCEPTED con pago PAID`);

      // Enviar notificación en tiempo real al cliente
      if (this.notificationsGateway) {
        this.notificationsGateway.notifyPaymentConfirmed(order.userId, updatedOrder);
        this.logger.log(`🔔 Notificación enviada al cliente ${order.userId}`);
      }

      // Enviar notificación al proveedor de nuevo pedido pagado
      if (this.notificationsGateway && order.encargadoId) {
        this.notificationsGateway.notifyNewOrder(order.encargadoId, updatedOrder);
        this.logger.log(`🔔 Notificación enviada al proveedor ${order.encargadoId}`);
      }

    } catch (error) {
      this.logger.error('❌ Error manejando transacción aprobada:', error);
      throw error;
    }
  }

  /**
   * Maneja una transacción rechazada o con error
   */
  private async handleFailedTransaction(order: any, transaction: any): Promise<void> {
    try {
      // Cancelar el pedido automáticamente
      const updatedOrder = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'FAILED',
          paymentIntentId: transaction.id,
        },
        include: {
          user: true,
          encargado: true,
        }
      });

      this.logger.log(`❌ Pedido ${order.id} cancelado automáticamente por pago ${transaction.status}`);

      // Notificar al cliente sobre el pago rechazado
      if (this.notificationsGateway) {
        this.notificationsGateway.emitToUser(
          order.userId,
          'paymentFailed',
          {
            type: 'PAYMENT_FAILED',
            order: updatedOrder,
            reason: transaction.status_message || 'Pago rechazado',
            timestamp: new Date().toISOString(),
          }
        );
        this.logger.log(`🔔 Notificación de pago rechazado enviada al cliente ${order.userId}`);
      }

    } catch (error) {
      this.logger.error('❌ Error manejando transacción rechazada:', error);
      throw error;
    }
  }

  /**
   * Maneja el evento nequi_token.updated
   */
  async handleNequiTokenUpdated(event: any): Promise<void> {
    try {
      const token = event.data.nequi_token;
      this.logger.log(`🟣 Token Nequi actualizado: ${token.id} - Estado: ${token.status}`);
      
      // Aquí puedes implementar lógica para tokens de pago recurrente
      // Por ejemplo, guardar el token en la base de datos si es APPROVED
      
    } catch (error) {
      this.logger.error('❌ Error manejando nequi_token.updated:', error);
      throw error;
    }
  }

  /**
   * Maneja el evento bancolombia_transfer_token.updated
   */
  async handleBancolombiaTokenUpdated(event: any): Promise<void> {
    try {
      const token = event.data.bancolombia_transfer_token;
      this.logger.log(`🔴 Token Bancolombia actualizado: ${token.id} - Estado: ${token.status}`);
      
      // Implementar lógica similar a Nequi para tokens de Bancolombia
      
    } catch (error) {
      this.logger.error('❌ Error manejando bancolombia_transfer_token.updated:', error);
      throw error;
    }
  }

  /**
   * Utilidad para obtener propiedades anidadas de un objeto
   * Ejemplo: getNestedProperty(obj, 'transaction.id') => obj.transaction.id
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj) || '';
  }
}
