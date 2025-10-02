import { Injectable, Logger, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CardTokenData {
  number: string;
  cvc: string;
  exp_month: string;
  exp_year: string;
  card_holder: string;
}

export interface TokenizedCard {
  id: string;
  created_at: string;
  brand: string;
  name: string;
  last_four: string;
  bin: string;
  exp_year: string;
  exp_month: string;
  card_holder: string;
  expires_at: string;
}

export interface NequiTokenData {
  phone_number: string;
}

export interface TokenizedNequi {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  phone_number: string;
  name: string;
}

@Injectable()
export class TokenizationService {
  private readonly logger = new Logger(TokenizationService.name);
  private readonly apiUrl: string;
  private readonly publicKey: string;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('WOMPI_API_URL') || 'https://sandbox.wompi.co/v1';
    this.publicKey = this.configService.get<string>('WOMPI_PUBLIC_KEY');
  }

  /**
   * Tokeniza una tarjeta de crédito/débito
   */
  async tokenizeCard(cardData: CardTokenData): Promise<TokenizedCard> {
    try {
      this.logger.log('🔐 Tokenizando tarjeta...');
      
      // Validar datos de entrada
      this.validateCardData(cardData);

      const response = await fetch(`${this.apiUrl}/tokens/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.publicKey}`,
        },
        body: JSON.stringify({
          number: cardData.number.replace(/\s/g, ''), // Remover espacios
          cvc: cardData.cvc,
          exp_month: cardData.exp_month.padStart(2, '0'), // Asegurar 2 dígitos
          exp_year: cardData.exp_year,
          card_holder: cardData.card_holder
        }),
      });

      const data = await response.json();
      this.logger.log('📥 Response de tokenización:', JSON.stringify(data, null, 2));

      if (!response.ok || data.error) {
        this.logger.error(`❌ HTTP Error ${response.status}:`, JSON.stringify(data, null, 2));
        
        // Extraer mensaje de error detallado de Wompi
        let errorMessage = 'Error tokenizando tarjeta';
        
        if (data.error?.messages) {
          // Wompi devuelve mensajes de validación en formato { field: [errors] }
          const messages = Object.entries(data.error.messages)
            .map(([field, errors]: [string, any]) => {
              const errorList = Array.isArray(errors) ? errors.join(', ') : errors;
              return `${field}: ${errorList}`;
            })
            .join('; ');
          errorMessage = messages;
        } else if (data.error?.reason) {
          errorMessage = data.error.reason;
        } else if (data.error?.type) {
          errorMessage = `${data.error.type}: ${JSON.stringify(data.error)}`;
        }
        
        throw new HttpException(errorMessage, response.status);
      }

      if (data.status !== 'CREATED') {
        throw new Error(`Estado inesperado de tokenización: ${data.status}`);
      }

      const tokenizedCard = data.data;
      this.logger.log(`✅ Tarjeta tokenizada exitosamente: ${tokenizedCard.id}`);
      
      return tokenizedCard;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error tokenizando tarjeta: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Tokeniza una cuenta Nequi para pagos recurrentes
   */
  async tokenizeNequi(nequiData: NequiTokenData): Promise<TokenizedNequi> {
    try {
      this.logger.log('🔐 Tokenizando cuenta Nequi...');
      
      // Validar número de teléfono
      this.validateNequiData(nequiData);

      const response = await fetch(`${this.apiUrl}/tokens/nequi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.publicKey}`,
        },
        body: JSON.stringify({
          phone_number: nequiData.phone_number
        }),
      });

      const data = await response.json();
      this.logger.log('📥 Response de tokenización Nequi:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        this.logger.error(`❌ HTTP Error ${response.status}:`, data);
        throw new Error(data.error?.reason || `Error tokenizando Nequi: ${response.status}`);
      }

      if (data.error) {
        this.logger.error('❌ Wompi Nequi Tokenization Error:', data.error);
        throw new Error(data.error.reason || 'Error en tokenización Nequi');
      }

      const tokenizedNequi = data.data;
      this.logger.log(`✅ Nequi tokenizado: ${tokenizedNequi.id} - Estado: ${tokenizedNequi.status}`);
      
      return tokenizedNequi;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error tokenizando Nequi: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Consulta el estado de un token Nequi
   */
  async getNequiTokenStatus(tokenId: string): Promise<TokenizedNequi> {
    try {
      this.logger.log(`🔍 Consultando estado del token Nequi: ${tokenId}`);

      const response = await fetch(`${this.apiUrl}/tokens/nequi/${tokenId}`, {
        headers: {
          'Authorization': `Bearer ${this.publicKey}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`❌ HTTP Error ${response.status}:`, data);
        throw new Error(data.error?.reason || `Error consultando token Nequi: ${response.status}`);
      }

      if (data.error) {
        this.logger.error('❌ Wompi Nequi Token Status Error:', data.error);
        throw new Error(data.error.reason || 'Error consultando estado de token Nequi');
      }

      const tokenStatus = data.data;
      this.logger.log(`✅ Estado del token Nequi: ${tokenStatus.status}`);
      
      return tokenStatus;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error consultando token Nequi: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Valida los datos de la tarjeta
   */
  private validateCardData(cardData: CardTokenData): void {
    if (!cardData.number || cardData.number.replace(/\s/g, '').length < 13) {
      throw new Error('Número de tarjeta inválido');
    }

    if (!cardData.cvc || cardData.cvc.length < 3 || cardData.cvc.length > 4) {
      throw new Error('CVC inválido');
    }

    if (!cardData.exp_month || !cardData.exp_year) {
      throw new Error('Fecha de expiración inválida');
    }

    const month = parseInt(cardData.exp_month);
    if (month < 1 || month > 12) {
      throw new Error('Mes de expiración inválido');
    }

    const year = parseInt(cardData.exp_year);
    const currentYear = new Date().getFullYear() % 100;
    if (year < currentYear) {
      throw new Error('Año de expiración inválido');
    }

    if (!cardData.card_holder || cardData.card_holder.length < 5) {
      throw new Error('Nombre del tarjetahabiente inválido (mínimo 5 caracteres)');
    }
  }

  /**
   * Valida los datos de Nequi
   */
  private validateNequiData(nequiData: NequiTokenData): void {
    if (!nequiData.phone_number) {
      throw new Error('Número de teléfono requerido');
    }

    // Validar formato de número colombiano
    const phoneRegex = /^3\d{9}$/;
    if (!phoneRegex.test(nequiData.phone_number)) {
      throw new Error('Número de teléfono inválido (debe ser formato colombiano 3XXXXXXXXX)');
    }
  }

  /**
   * Obtiene números de tarjeta de prueba para sandbox
   */
  getTestCardNumbers(): { approved: string; declined: string } {
    return {
      approved: '4242424242424242',
      declined: '4111111111111111'
    };
  }

  /**
   * Obtiene números de Nequi de prueba para sandbox
   */
  getTestNequiNumbers(): { approved: string; declined: string } {
    return {
      approved: '3991111111',
      declined: '3992222222'
    };
  }
}
