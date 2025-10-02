import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface SignatureParams {
  reference: string;
  amount_in_cents: number;
  currency: string;
  expiration_time?: string;
}

@Injectable()
export class IntegritySignatureService {
  private readonly logger = new Logger(IntegritySignatureService.name);
  private readonly integritySecret: string;

  constructor(private configService: ConfigService) {
    this.integritySecret = this.configService.get<string>('WOMPI_INTEGRITY_SECRET');
    
    if (!this.integritySecret) {
      this.logger.warn('⚠️ WOMPI_INTEGRITY_SECRET no configurado');
    }
  }

  /**
   * Genera la firma de integridad SHA256 para Wompi
   */
  generateSignature(params: SignatureParams): string {
    try {
      this.logger.log('🔐 Generando firma de integridad...');
      
      if (!this.integritySecret) {
        throw new Error('Secreto de integridad no configurado');
      }

      // Construir cadena de concatenación según documentación Wompi
      let concatenatedString: string;
      
      if (params.expiration_time) {
        // Con fecha de expiración: "<Referencia><Monto><Moneda><FechaExpiracion><SecretoIntegridad>"
        concatenatedString = `${params.reference}${params.amount_in_cents}${params.currency}${params.expiration_time}${this.integritySecret}`;
      } else {
        // Sin fecha de expiración: "<Referencia><Monto><Moneda><SecretoIntegridad>"
        concatenatedString = `${params.reference}${params.amount_in_cents}${params.currency}${this.integritySecret}`;
      }

      this.logger.log('🔗 Cadena concatenada (sin secreto):', 
        concatenatedString.replace(this.integritySecret, '[SECRET]')
      );

      // Generar hash SHA256
      const signature = crypto
        .createHash('sha256')
        .update(concatenatedString)
        .digest('hex');

      this.logger.log(`✅ Firma generada: ${signature.substring(0, 16)}...`);
      
      return signature;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error generando firma: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Valida una firma de integridad
   */
  validateSignature(params: SignatureParams, providedSignature: string): boolean {
    try {
      const expectedSignature = this.generateSignature(params);
      const isValid = expectedSignature === providedSignature;
      
      this.logger.log(`🔍 Validación de firma: ${isValid ? '✅ Válida' : '❌ Inválida'}`);
      
      return isValid;
    } catch (error) {
      this.logger.error('❌ Error validando firma:', error);
      return false;
    }
  }

  /**
   * Genera una referencia única para transacciones
   */
  generateReference(prefix: string = 'TXN'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const reference = `${prefix}-${timestamp}-${random}`;
    
    this.logger.log(`🆔 Referencia generada: ${reference}`);
    
    return reference;
  }

  /**
   * Genera parámetros completos para Widget/Checkout Web
   */
  generateWidgetParams(params: {
    amount_in_cents: number;
    currency: string;
    customer_email: string;
    reference?: string;
    redirect_url?: string;
    expiration_time?: string;
  }) {
    const reference = params.reference || this.generateReference('WIDGET');
    const publicKey = this.configService.get<string>('WOMPI_PUBLIC_KEY');
    
    const signatureParams: SignatureParams = {
      reference,
      amount_in_cents: params.amount_in_cents,
      currency: params.currency,
      expiration_time: params.expiration_time
    };

    const signature = this.generateSignature(signatureParams);

    const widgetParams = {
      'public-key': publicKey,
      'currency': params.currency,
      'amount-in-cents': params.amount_in_cents.toString(),
      'reference': reference,
      'signature:integrity': signature,
      'customer-data:email': params.customer_email,
      ...(params.redirect_url && { 'redirect-url': params.redirect_url }),
      ...(params.expiration_time && { 'expiration-time': params.expiration_time })
    };

    this.logger.log('🎛️ Parámetros de Widget generados:', {
      reference,
      amount: params.amount_in_cents,
      signature: signature.substring(0, 16) + '...'
    });

    return widgetParams;
  }

  /**
   * Genera HTML para Checkout Web
   */
  generateCheckoutWebForm(params: {
    amount_in_cents: number;
    currency: string;
    customer_email: string;
    customer_name?: string;
    reference?: string;
    redirect_url?: string;
    expiration_time?: string;
  }): string {
    const widgetParams = this.generateWidgetParams(params);
    
    let formHTML = `<form action="https://checkout.wompi.co/p/" method="GET">\n`;
    
    // Campos obligatorios
    formHTML += `  <input type="hidden" name="public-key" value="${widgetParams['public-key']}" />\n`;
    formHTML += `  <input type="hidden" name="currency" value="${widgetParams['currency']}" />\n`;
    formHTML += `  <input type="hidden" name="amount-in-cents" value="${widgetParams['amount-in-cents']}" />\n`;
    formHTML += `  <input type="hidden" name="reference" value="${widgetParams['reference']}" />\n`;
    formHTML += `  <input type="hidden" name="signature:integrity" value="${widgetParams['signature:integrity']}" />\n`;
    
    // Campos opcionales
    if (params.customer_email) {
      formHTML += `  <input type="hidden" name="customer-data:email" value="${params.customer_email}" />\n`;
    }
    
    if (params.customer_name) {
      formHTML += `  <input type="hidden" name="customer-data:full-name" value="${params.customer_name}" />\n`;
    }
    
    if (params.redirect_url) {
      formHTML += `  <input type="hidden" name="redirect-url" value="${params.redirect_url}" />\n`;
    }
    
    if (params.expiration_time) {
      formHTML += `  <input type="hidden" name="expiration-time" value="${params.expiration_time}" />\n`;
    }
    
    formHTML += `  <button type="submit">Pagar con Wompi</button>\n`;
    formHTML += `</form>`;

    this.logger.log('📝 Formulario de Checkout Web generado');
    
    return formHTML;
  }

  /**
   * Genera configuración para Widget JavaScript
   */
  generateWidgetConfig(params: {
    amount_in_cents: number;
    currency: string;
    customer_email: string;
    reference?: string;
    redirect_url?: string;
    expiration_time?: string;
  }) {
    const reference = params.reference || this.generateReference('WIDGET');
    const publicKey = this.configService.get<string>('WOMPI_PUBLIC_KEY');
    
    const signatureParams: SignatureParams = {
      reference,
      amount_in_cents: params.amount_in_cents,
      currency: params.currency,
      expiration_time: params.expiration_time
    };

    const signature = this.generateSignature(signatureParams);

    const config = {
      currency: params.currency,
      amountInCents: params.amount_in_cents,
      reference: reference,
      publicKey: publicKey,
      signature: {
        integrity: signature
      },
      ...(params.redirect_url && { redirectUrl: params.redirect_url }),
      ...(params.expiration_time && { expirationTime: params.expiration_time }),
      customerData: {
        email: params.customer_email
      }
    };

    this.logger.log('⚙️ Configuración de Widget JavaScript generada');
    
    return config;
  }

  /**
   * Obtiene tokens de aceptación desde Wompi
   */
  async getAcceptanceTokens(): Promise<{
    acceptance_token: string;
    accept_personal_auth: string;
    acceptance_permalink: string;
    personal_data_permalink: string;
  }> {
    try {
      const publicKey = this.configService.get<string>('WOMPI_PUBLIC_KEY');
      const apiUrl = this.configService.get<string>('WOMPI_API_URL') || 'https://sandbox.wompi.co/v1';
      
      this.logger.log('🔍 Obteniendo tokens de aceptación...');

      const response = await fetch(`${apiUrl}/merchants/${publicKey}`, {
        headers: {
          'Authorization': `Bearer ${publicKey}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`❌ HTTP Error ${response.status}:`, data);
        throw new Error(data.error?.reason || `Error obteniendo tokens: ${response.status}`);
      }

      const presignedAcceptance = data.data.presigned_acceptance;
      const presignedPersonalAuth = data.data.presigned_personal_data_auth;

      this.logger.log('✅ Tokens de aceptación obtenidos exitosamente');

      return {
        acceptance_token: presignedAcceptance.acceptance_token,
        accept_personal_auth: presignedPersonalAuth.acceptance_token,
        acceptance_permalink: presignedAcceptance.permalink,
        personal_data_permalink: presignedPersonalAuth.permalink
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error obteniendo tokens de aceptación: ${errorMessage}`);
      throw error;
    }
  }
}
