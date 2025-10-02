import { Controller, Post, Body, Headers, UseGuards, Get, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { WompiService } from './wompi.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly wompiService: WompiService,
  ) {}

  @Post('confirm-cash')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirmar pago en efectivo' })
  async confirmCashPayment(@Body() body: { orderId: string }) {
    return this.paymentsService.confirmCashPayment(body.orderId);
  }

  @Get('status/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener estado de pago de un pedido' })
  async getPaymentStatus(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentStatus(orderId);
  }

  @Post('wompi/webhook')
  @ApiOperation({ summary: 'Webhook de Wompi para eventos de pago' })
  async handleWompiWebhook(
    @Headers('x-event-checksum') signature: string,
    @Body() payload: any,
  ) {
    return this.wompiService.handleWebhook(signature, payload);
  }

  @Get('wompi/transaction/:transactionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar estado de transacción Wompi' })
  async getWompiTransaction(@Param('transactionId') transactionId: string) {
    return this.wompiService.getTransaction(transactionId);
  }

  @Post('wompi/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar y actualizar pago de Wompi' })
  async verifyWompiPayment(
    @Body() body: { orderId: string; transactionId: string },
  ) {
    return this.wompiService.verifyAndUpdatePayment(body.orderId, body.transactionId);
  }
}
