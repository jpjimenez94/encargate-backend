import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { WompiService } from './wompi.service';
import { TokenizationService, CardTokenData, NequiTokenData } from './tokenization.service';
import { IntegritySignatureService, SignatureParams } from './integrity-signature.service';

@Controller('wompi')
export class WompiController {
  constructor(
    private readonly wompiService: WompiService,
    private readonly tokenizationService: TokenizationService,
    private readonly integritySignatureService: IntegritySignatureService
  ) {}

  @Get('acceptance-token')
  async getAcceptanceToken() {
    // DEPRECADO: Usar acceptance-tokens en su lugar
    const tokens = await this.wompiService.getAcceptanceTokens();
    return { acceptance_token: tokens.acceptance_token };
  }

  @Get('acceptance-tokens')
  async getAcceptanceTokens() {
    return await this.wompiService.getAcceptanceTokens();
  }

  @Post('create-nequi-transaction')
  async createNequiTransaction(@Body() paymentData: any) {
    const transaction = await this.wompiService.createNequiTransaction(paymentData);
    return { data: transaction };
  }

  @Post('create-pse-transaction')
  async createPSETransaction(@Body() paymentData: any) {
    const transaction = await this.wompiService.createPSETransaction(paymentData);
    return { data: transaction };
  }

  @Post('create-bancolombia-transaction')
  async createBancolombiaTransaction(@Body() paymentData: any) {
    const transaction = await this.wompiService.createBancolombiaTransaction(paymentData);
    return { data: transaction };
  }

  @Post('create-card-transaction')
  async createCardTransaction(@Body() paymentData: any) {
    const transaction = await this.wompiService.createCardTransaction(paymentData);
    return { data: transaction };
  }

  @Get('pse-banks')
  async getPSEBanks() {
    return await this.wompiService.getPSEBanks();
  }

  @Get('transaction/:id')
  async getTransaction(@Param('id') id: string) {
    const transaction = await this.wompiService.getTransaction(id);
    return { data: transaction };
  }

  @Post('cancel-transaction/:id')
  async cancelTransaction(@Param('id') id: string) {
    const result = await this.wompiService.cancelTransaction(id);
    return { data: result };
  }

  @Get('config-check')
  async checkConfig() {
    const publicKey = process.env.WOMPI_PUBLIC_KEY;
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
    
    return {
      hasPublicKey: !!publicKey,
      hasIntegritySecret: !!integritySecret,
      publicKeyPreview: publicKey ? publicKey.substring(0, 10) + '...' : 'NOT_SET',
      message: (!publicKey || !integritySecret) 
        ? 'Variables de Wompi no configuradas en .env' 
        : 'Variables de Wompi configuradas correctamente'
    };
  }

  // ==================== TOKENIZACIÓN ====================

  @Post('tokenize/card')
  async tokenizeCard(@Body() cardData: CardTokenData) {
    const tokenizedCard = await this.tokenizationService.tokenizeCard(cardData);
    return { data: tokenizedCard };
  }

  @Post('tokenize/nequi')
  async tokenizeNequi(@Body() nequiData: NequiTokenData) {
    const tokenizedNequi = await this.tokenizationService.tokenizeNequi(nequiData);
    return { data: tokenizedNequi };
  }

  @Get('tokenize/nequi/:tokenId/status')
  async getNequiTokenStatus(@Param('tokenId') tokenId: string) {
    const status = await this.tokenizationService.getNequiTokenStatus(tokenId);
    return { data: status };
  }

  @Get('tokenize/test-numbers')
  async getTestNumbers() {
    const cardNumbers = this.tokenizationService.getTestCardNumbers();
    const nequiNumbers = this.tokenizationService.getTestNequiNumbers();
    
    return {
      data: {
        cards: cardNumbers,
        nequi: nequiNumbers
      }
    };
  }

  // ==================== FIRMA DE INTEGRIDAD ====================

  @Get('signature/generate')
  async generateSignature(@Query() params: SignatureParams) {
    const signature = this.integritySignatureService.generateSignature(params);
    return { 
      data: { 
        signature,
        reference: params.reference
      } 
    };
  }

  @Post('signature/validate')
  async validateSignature(@Body() body: { params: SignatureParams; signature: string }) {
    const isValid = this.integritySignatureService.validateSignature(body.params, body.signature);
    return { 
      data: { 
        isValid,
        message: isValid ? 'Firma válida' : 'Firma inválida'
      } 
    };
  }

  @Get('signature/reference')
  async generateReference(@Query('prefix') prefix?: string) {
    const reference = this.integritySignatureService.generateReference(prefix);
    return { data: { reference } };
  }

  // ==================== WIDGET Y CHECKOUT WEB ====================

  @Post('widget/params')
  async generateWidgetParams(@Body() params: {
    amount_in_cents: number;
    currency: string;
    customer_email: string;
    reference?: string;
    redirect_url?: string;
    expiration_time?: string;
  }) {
    const widgetParams = this.integritySignatureService.generateWidgetParams(params);
    return { data: widgetParams };
  }

  @Post('widget/config')
  async generateWidgetConfig(@Body() params: {
    amount_in_cents: number;
    currency: string;
    customer_email: string;
    reference?: string;
    redirect_url?: string;
    expiration_time?: string;
  }) {
    const config = this.integritySignatureService.generateWidgetConfig(params);
    return { data: config };
  }

  @Post('checkout-web/form')
  async generateCheckoutWebForm(@Body() params: {
    amount_in_cents: number;
    currency: string;
    customer_email: string;
    customer_name?: string;
    reference?: string;
    redirect_url?: string;
    expiration_time?: string;
  }) {
    const formHTML = this.integritySignatureService.generateCheckoutWebForm(params);
    return { 
      data: { 
        html: formHTML,
        action: 'https://checkout.wompi.co/p/'
      } 
    };
  }
}
