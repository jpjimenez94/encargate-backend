import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets = new Map<string, string>(); // userId -> socketId

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Cliente desconectado: ${client.id}`);
    
    // Remover del mapa de usuarios
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        this.logger.log(`👤 Usuario ${userId} desconectado`);
        break;
      }
    }
  }

  @SubscribeMessage('register')
  handleRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; role: string },
  ) {
    this.userSockets.set(data.userId, client.id);
    this.logger.log(`✅ Usuario registrado: ${data.userId} (${data.role}) - Socket: ${client.id}`);
    
    // Confirmar registro
    client.emit('registered', { 
      success: true, 
      userId: data.userId,
      message: 'Conectado al sistema de notificaciones en tiempo real' 
    });
  }

  // Emitir notificación a un usuario específico
  emitToUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
      this.logger.log(`📤 Evento '${event}' enviado a usuario ${userId}`);
      return true;
    }
    this.logger.warn(`⚠️ Usuario ${userId} no está conectado`);
    return false;
  }

  // Emitir notificación de nuevo pedido al proveedor
  notifyNewOrder(encargadoId: string, orderData: any) {
    this.emitToUser(encargadoId, 'newOrder', {
      type: 'NEW_ORDER',
      order: orderData,
      timestamp: new Date().toISOString(),
    });
  }

  // Emitir notificación de cambio de estado al cliente
  notifyOrderStatusChange(userId: string, orderData: any) {
    this.emitToUser(userId, 'orderStatusChange', {
      type: 'ORDER_STATUS_CHANGE',
      order: orderData,
      timestamp: new Date().toISOString(),
    });
  }

  // Emitir notificación de pago confirmado
  notifyPaymentConfirmed(userId: string, orderData: any) {
    this.emitToUser(userId, 'paymentConfirmed', {
      type: 'PAYMENT_CONFIRMED',
      order: orderData,
      timestamp: new Date().toISOString(),
    });
  }

  // Emitir notificación de pedido completado
  notifyOrderCompleted(userId: string, orderData: any) {
    this.emitToUser(userId, 'orderCompleted', {
      type: 'ORDER_COMPLETED',
      order: orderData,
      timestamp: new Date().toISOString(),
    });
  }

  // Emitir notificación de nueva reseña al proveedor
  notifyNewReview(encargadoId: string, reviewData: any) {
    this.emitToUser(encargadoId, 'newReview', {
      type: 'NEW_REVIEW',
      review: reviewData,
      timestamp: new Date().toISOString(),
    });
  }

  // Broadcast a todos los usuarios conectados (para mantenimiento, etc.)
  broadcastToAll(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.log(`📢 Broadcast '${event}' enviado a todos los usuarios`);
  }

  // Obtener estadísticas de conexiones
  getConnectionStats() {
    return {
      totalConnections: this.userSockets.size,
      connectedUsers: Array.from(this.userSockets.keys()),
    };
  }
}
