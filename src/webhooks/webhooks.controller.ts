import { Controller, Post, Body, Headers, Logger, HttpCode } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * Webhook de Wompi para eventos de transacciones
   * Documentación: https://docs.wompi.co/docs/es/eventos
   * 
   * Wompi envía eventos a esta URL cuando:
   * - Una transacción cambia de estado (transaction.updated)
   * - Un token de Nequi cambia de estado (nequi_token.updated)
   * - Un token de Bancolombia cambia de estado (bancolombia_transfer_token.updated)
   * 
   * IMPORTANTE: Debe devolver status 200 para que Wompi no reintente
   */
  @Post('wompi/events')
  @HttpCode(200)
  async handleWompiEvent(
    @Body() event: any,
    @Headers('x-event-checksum') checksum: string,
  ) {
    try {
      this.logger.log(`📨 Webhook recibido de Wompi: ${event.event}`);
      this.logger.log(`📋 Datos del evento:`, JSON.stringify(event, null, 2));
      
      // 1. Validar la firma de seguridad
      const isValid = await this.webhooksService.validateWompiChecksum(event, checksum);
      
      if (!isValid) {
        this.logger.error('❌ Checksum inválido - posible ataque de suplantación');
        return { 
          status: 'error', 
          message: 'Invalid checksum' 
        };
      }
      
      this.logger.log('✅ Checksum validado correctamente');
      
      // 2. Procesar el evento según su tipo
      switch (event.event) {
        case 'transaction.updated':
          await this.webhooksService.handleTransactionUpdated(event);
          break;
          
        case 'nequi_token.updated':
          await this.webhooksService.handleNequiTokenUpdated(event);
          break;
          
        case 'bancolombia_transfer_token.updated':
          await this.webhooksService.handleBancolombiaTokenUpdated(event);
          break;
          
        default:
          this.logger.warn(`⚠️ Tipo de evento desconocido: ${event.event}`);
      }
      
      // 3. SIEMPRE devolver 200 para que Wompi no reintente
      return { 
        status: 'success', 
        message: 'Event processed successfully' 
      };
      
    } catch (error) {
      this.logger.error('❌ Error procesando webhook de Wompi:', error);
      
      // Incluso con error, devolver 200 para evitar reintentos infinitos
      // El error se registra en logs para investigación
      return { 
        status: 'error', 
        message: 'Event received but processing failed',
        error: error.message 
      };
    }
  }

  /**
   * Endpoint para probar el webhook localmente
   */
  @Post('wompi/test')
  @HttpCode(200)
  async testWebhook(@Body() testData: any) {
    this.logger.log('🧪 Webhook de prueba recibido');
    return {
      status: 'success',
      message: 'Test webhook received',
      data: testData
    };
  }
}
