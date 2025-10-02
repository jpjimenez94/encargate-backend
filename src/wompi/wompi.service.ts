import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WompiService {
  private readonly logger = new Logger(WompiService.name);
  private readonly apiUrl: string;
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly integritySecret: string;
  private readonly eventsSecret: string;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('WOMPI_API_URL') || 'https://sandbox.wompi.co/v1';
    this.publicKey = this.configService.get<string>('WOMPI_PUBLIC_KEY');
    this.privateKey = this.configService.get<string>('WOMPI_PRIVATE_KEY');
    this.integritySecret = this.configService.get<string>('WOMPI_INTEGRITY_SECRET');
    this.eventsSecret = this.configService.get<string>('WOMPI_EVENTS_SECRET');
    
    // Validar configuración crítica
    if (!this.publicKey) {
      this.logger.error('WOMPI_PUBLIC_KEY no configurada');
      throw new Error('WOMPI_PUBLIC_KEY es requerida');
    }
    
    if (!this.privateKey) {
      this.logger.error('WOMPI_PRIVATE_KEY no configurada');
      throw new Error('WOMPI_PRIVATE_KEY es requerida para llamadas al API');
    }
    
    if (!this.integritySecret) {
      this.logger.warn('WOMPI_INTEGRITY_SECRET no configurada - funcionará sin firma');
    }
    
    if (!this.eventsSecret) {
      this.logger.warn('WOMPI_EVENTS_SECRET no configurada - webhooks no podrán validarse');
    }
    
    this.logger.log(`WompiService inicializado - Ambiente: ${this.apiUrl}`);
  }

  /**
   * Obtiene los tokens de aceptación completos (acceptance_token y accept_personal_auth)
   * Estos tokens son OBLIGATORIOS para todas las transacciones.
   * Se obtienen desde: GET /v1/merchants/:public_key
   */
  async getAcceptanceTokens(): Promise<{
    acceptance_token: string;
    accept_personal_auth: string;
    acceptance_permalink?: string;
    personal_auth_permalink?: string;
  }> {
    try {
      this.logger.log('🔐 Obteniendo tokens de aceptación de Wompi...');
      
      // Obtener tokens del endpoint oficial de Wompi
      const response = await fetch(`${this.apiUrl}/merchants/${this.publicKey}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error(`❌ Error ${response.status} obteniendo tokens:`, errorData);
        throw new Error(`No se pudieron obtener tokens de aceptación (${response.status})`);
      }

      const data = await response.json();
      this.logger.log('📥 Respuesta de Wompi merchants:', JSON.stringify(data, null, 2));
      
      // Extraer ambos tokens según la estructura de Wompi
      const acceptanceToken = data.data?.presigned_acceptance?.acceptance_token;
      const acceptancePermalink = data.data?.presigned_acceptance?.permalink;
      const personalAuthToken = data.data?.presigned_personal_data_auth?.acceptance_token;
      const personalAuthPermalink = data.data?.presigned_personal_data_auth?.permalink;
      
      if (!acceptanceToken || !personalAuthToken) {
        this.logger.error('❌ Tokens incompletos en respuesta:', {
          hasAcceptanceToken: !!acceptanceToken,
          hasPersonalAuthToken: !!personalAuthToken
        });
        throw new Error('Los tokens de aceptación están incompletos');
      }
      
      this.logger.log('✅ Tokens de aceptación obtenidos correctamente');
      
      return {
        acceptance_token: acceptanceToken,
        accept_personal_auth: personalAuthToken,
        acceptance_permalink: acceptancePermalink,
        personal_auth_permalink: personalAuthPermalink,
      };
    } catch (error) {
      this.logger.error('❌ Error crítico obteniendo tokens de aceptación:', error.message);
      throw error; // Lanzar error para que el método que llama maneje el fallo
    }
  }

  /**
   * Genera una referencia única para transacciones
   * Formato: PREFIX-UUID-TIMESTAMP-RANDOM
   */
  private generateUniqueReference(prefix: string = 'ENCARGATE'): string {
    const uuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    return `${prefix}-${uuid}-${timestamp}-${randomSuffix}`;
  }

  async generateIntegritySignature(reference: string, amount: number, currency: string): Promise<string> {
    if (!this.integritySecret) {
      this.logger.warn('No integrity secret configured');
      return null;
    }

    const crypto = require('crypto');
    const data = `${reference}${amount}${currency}${this.integritySecret}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    
    return hash;
  }

  async createNequiTransaction(paymentData: any): Promise<any> {
    try {
      // Validar datos de entrada
      if (!paymentData) {
        throw new Error('Datos de pago requeridos');
      }
      
      const { amount, currency, customerEmail, phoneNumber } = paymentData;
      
      if (!amount || !currency || !customerEmail || !phoneNumber) {
        throw new Error('Faltan campos requeridos: amount, currency, customerEmail, phoneNumber');
      }
      
      // Generar referencia única (ignorar la que viene del frontend)
      let finalReference = this.generateUniqueReference('NEQUI');
      let attempts = 0;
      const maxAttempts = 3;
      
      // Intentar hasta 3 veces con diferentes referencias si hay conflicto
      while (attempts < maxAttempts) {
        attempts++;
        
        // Si no es el primer intento, generar nueva referencia
        if (attempts > 1) {
          finalReference = this.generateUniqueReference('NEQUI');
          this.logger.log(`🔄 Intento ${attempts}/${maxAttempts} con nueva referencia: ${finalReference}`);
        }
        
        this.logger.log('🟣 Iniciando transacción Nequi:', { 
          reference: finalReference, 
          amount, 
          currency, 
          customerEmail, 
          phoneNumber,
          attempt: attempts 
        });
        
        try {
          // Obtener tokens de aceptación (OBLIGATORIO)
          const tokens = await this.getAcceptanceTokens();
          const signature = await this.generateIntegritySignature(
            finalReference,
            amount,
            currency
          );

          const requestBody: any = {
            acceptance_token: tokens.acceptance_token,
            accept_personal_auth: tokens.accept_personal_auth,
            amount_in_cents: amount,
            currency: currency,
            customer_email: customerEmail,
            reference: finalReference,
            payment_method: {
              type: 'NEQUI',
              phone_number: phoneNumber,
            },
          };

          if (signature) {
            requestBody.signature = signature;
          }

          this.logger.log('📤 Request a Wompi:', JSON.stringify(requestBody, null, 2));

          const response = await fetch(`${this.apiUrl}/transactions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.privateKey}`,  // Usar llave PRIVADA para API
            },
            body: JSON.stringify(requestBody),
          });

          const data = await response.json();
          this.logger.log('📥 Response de Wompi:', JSON.stringify(data, null, 2));

          if (!response.ok) {
            this.logger.error(`❌ HTTP Error ${response.status}:`, data);
            
            // Si es error de referencia duplicada y tenemos más intentos, continuar el loop
            if (data.error && data.error.messages && data.error.messages.reference && 
                data.error.messages.reference.includes('La referencia ya ha sido usada') && 
                attempts < maxAttempts) {
              this.logger.warn(`⚠️ Referencia duplicada en intento ${attempts}, generando nueva...`);
              continue; // Continuar con el siguiente intento
            }
            
            // Extraer mensaje de error más específico
            if (data.error && data.error.messages) {
              const errorMessages = Object.values(data.error.messages).flat().join(', ');
              throw new Error(errorMessages);
            }
            
            if (data.error && data.error.reason) {
              throw new Error(data.error.reason);
            }
            
            throw new Error(data.error?.type || `Error HTTP ${response.status}`);
          }
          
          // Verificar si hay errores en la respuesta de Wompi
          if (data.error) {
            this.logger.error('❌ Wompi API Error:', data.error);
            
            // Si es error de referencia duplicada y tenemos más intentos, continuar el loop
            if (data.error.messages && data.error.messages.reference && 
                data.error.messages.reference.includes('La referencia ya ha sido usada') && 
                attempts < maxAttempts) {
              this.logger.warn(`⚠️ Referencia duplicada en intento ${attempts}, generando nueva...`);
              continue; // Continuar con el siguiente intento
            }
            
            if (data.error.messages) {
              const errorMessages = Object.values(data.error.messages).flat().join(', ');
              throw new Error(errorMessages);
            }
            
            throw new Error(data.error.reason || data.error.type || 'Error desconocido');
          }

          const transaction = data.data;
          
          if (!transaction) {
            throw new Error('No se recibió respuesta de Wompi');
          }

          this.logger.log(`✅ Transacción creada: ${transaction.id} - Estado: ${transaction.status}`);

          // Validar estado
          switch (transaction.status) {
            case 'APPROVED':
            case 'PENDING':
              return transaction;
              
            case 'ERROR':
            case 'DECLINED':
              const errorMsg = transaction.status_message || 'Transacción rechazada';
              this.logger.error(`❌ Transacción rechazada: ${errorMsg}`);
              throw new Error(errorMsg);
              
            default:
              this.logger.warn(`⚠️ Estado desconocido: ${transaction.status}`);
              throw new Error(`Estado desconocido: ${transaction.status}`);
          }
        } catch (error) {
          // Si es el último intento, lanzar el error
          if (attempts >= maxAttempts) {
            throw error;
          }
          
          // Si es error de referencia duplicada, continuar con el siguiente intento
          if (error.message && error.message.includes('La referencia ya ha sido usada')) {
            this.logger.warn(`⚠️ Error de referencia duplicada en intento ${attempts}, reintentando...`);
            continue;
          }
          
          // Para otros errores, lanzar inmediatamente
          throw error;
        }
      }
      
      throw new Error('Se agotaron los intentos para crear la transacción');
    } catch (error) {
      this.logger.error('❌ Error creating Nequi transaction:', error.message || error);
      throw error;
    }
  }

  async createPSETransaction(paymentData: any): Promise<any> {
    try {
      // Generar referencia única para PSE
      const finalReference = this.generateUniqueReference('PSE');
      
      // Obtener tokens de aceptación (OBLIGATORIO)
      const tokens = await this.getAcceptanceTokens();
      const signature = await this.generateIntegritySignature(
        finalReference,
        paymentData.amount,
        paymentData.currency
      );

      const requestBody: any = {
        acceptance_token: tokens.acceptance_token,
        accept_personal_auth: tokens.accept_personal_auth,
        amount_in_cents: paymentData.amount,
        currency: paymentData.currency,
        customer_email: paymentData.customerEmail,
        reference: finalReference,
        payment_method: {
          type: 'PSE',
          user_type: paymentData.userType === 'NATURAL' ? 0 : 1, // 0 = NATURAL, 1 = JURIDICA
          user_legal_id_type: paymentData.userLegalIdType,
          user_legal_id: paymentData.userLegalId,
          financial_institution_code: paymentData.financialInstitutionCode,
          payment_description: `Pago servicio - ${paymentData.reference}`,
        },
        redirect_url: paymentData.redirectUrl,
      };

      if (signature) {
        requestBody.signature = signature;
      }

      this.logger.log('📤 Request PSE a Wompi:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${this.apiUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.privateKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      this.logger.log('📥 Response PSE de Wompi:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        this.logger.error(`❌ HTTP Error ${response.status}:`, data);
        
        if (data.error && data.error.messages) {
          const errorMessages = Object.values(data.error.messages).flat().join(', ');
          throw new Error(`Error de validación PSE: ${errorMessages}`);
        }
        
        throw new Error(data.error?.reason || `Error HTTP ${response.status}`);
      }

      if (data.error) {
        this.logger.error('❌ Wompi PSE Error:', data.error);
        throw new Error(data.error.reason || data.error.type || 'Error en transacción PSE');
      }

      const transaction = data.data;
      
      if (!transaction) {
        this.logger.error('❌ No se recibió transaction en data.data');
        this.logger.error('❌ Data completa:', JSON.stringify(data, null, 2));
        throw new Error('No se recibió respuesta de Wompi PSE');
      }

      this.logger.log(`✅ Transacción PSE creada: ${transaction.id} - Estado: ${transaction.status}`);

      switch (transaction.status) {
        case 'APPROVED':
        case 'PENDING':
          return transaction;
        case 'ERROR':
        case 'DECLINED':
          throw new Error(transaction.status_message || 'Transacción PSE rechazada');
        default:
          throw new Error(`Estado PSE desconocido: ${transaction.status}`);
      }
    } catch (error) {
      this.logger.error('Error creating PSE transaction:', error);
      throw error;
    }
  }

  async createBancolombiaTransaction(paymentData: any): Promise<any> {
    try {
      // Verificar si Bancolombia está disponible en el entorno actual
      this.logger.log('🔴 Verificando disponibilidad de Bancolombia...');
      
      // Generar referencia única para Bancolombia
      const finalReference = this.generateUniqueReference('BANCOLOMBIA');
      
      this.logger.log('🔴 Iniciando transacción Bancolombia:', { ...paymentData, reference: finalReference });
      
      // Obtener tokens de aceptación (OBLIGATORIO)
      const tokens = await this.getAcceptanceTokens();
      const signature = await this.generateIntegritySignature(
        finalReference,
        paymentData.amount,
        paymentData.currency
      );

      const requestBody: any = {
        acceptance_token: tokens.acceptance_token,
        accept_personal_auth: tokens.accept_personal_auth,
        amount_in_cents: paymentData.amount,
        currency: paymentData.currency,
        customer_email: paymentData.customerEmail,
        reference: finalReference,
        payment_method: {
          type: 'BANCOLOMBIA_TRANSFER',
          user_type: 'PERSON',
          payment_description: `Pago de servicio - ${paymentData.reference || finalReference}`,
          sandbox_status: 'APPROVED' // Para testing - en producción remover este campo
        },
        redirect_url: paymentData.redirectUrl,
      };

      if (signature) {
        requestBody.signature = signature;
      }

      this.logger.log('📤 Request a Wompi:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${this.apiUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.privateKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      this.logger.log('📥 Response de Wompi:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        this.logger.error(`❌ HTTP Error ${response.status}:`, data);
        
        // Manejo específico para errores de Bancolombia
        if (response.status === 422 && data.error?.type === 'INPUT_VALIDATION_ERROR') {
          // Verificar si son errores específicos de campos faltantes
          if (data.error.messages?.payment_method?.messages) {
            const missingFields = Object.keys(data.error.messages.payment_method.messages);
            this.logger.error(`❌ Campos faltantes en Bancolombia: ${missingFields.join(', ')}`);
            throw new Error(`Error en configuración de Bancolombia: faltan campos ${missingFields.join(', ')}. Intenta con Nequi o PSE.`);
          }
          
          this.logger.error('❌ Bancolombia no disponible en entorno de pruebas');
          throw new Error('Bancolombia no está disponible en el entorno de pruebas. Por favor usa Nequi o PSE.');
        }
        
        if (data.error && data.error.messages) {
          const errorMessages = Object.values(data.error.messages).flat().join(', ');
          throw new Error(errorMessages);
        }
        
        if (data.error && data.error.reason) {
          throw new Error(data.error.reason);
        }
        
        throw new Error(data.error?.type || `Error HTTP ${response.status}`);
      }

      if (data.error) {
        this.logger.error('❌ Wompi API Error:', data.error);
        
        if (data.error.messages) {
          const errorMessages = Object.values(data.error.messages).flat().join(', ');
          throw new Error(errorMessages);
        }
        
        throw new Error(data.error.reason || data.error.type || 'Error desconocido');
      }

      const transaction = data.data;
      
      if (!transaction) {
        throw new Error('No se recibió respuesta de Wompi Bancolombia');
      }

      this.logger.log(`✅ Transacción Bancolombia creada: ${transaction.id} - Estado: ${transaction.status}`);

      // Extraer la URL de redirección de Bancolombia
      const asyncPaymentUrl = transaction.payment_method?.extra?.async_payment_url;
      
      this.logger.log('🔍 Verificando URL de redirección Bancolombia...');
      this.logger.log(`🔍 payment_method.extra:`, JSON.stringify(transaction.payment_method?.extra, null, 2));
      
      if (asyncPaymentUrl) {
        this.logger.log(`🔗 URL de redirección Bancolombia encontrada: ${asyncPaymentUrl}`);
        // Agregar la URL de redirección al objeto transaction para compatibilidad
        transaction.redirect_url = asyncPaymentUrl;
      } else {
        this.logger.warn('⚠️ NO se encontró async_payment_url en payment_method.extra');
        this.logger.warn('⚠️ Esto es NORMAL en Sandbox - Bancolombia Transfer requiere producción para redirección completa');
        this.logger.warn('⚠️ La transacción fue creada pero no hay URL de redirección');
        
        // En Sandbox, si sandbox_status es APPROVED, marcar como aprobada directamente
        if (transaction.payment_method?.sandbox_status === 'APPROVED') {
          this.logger.log('✅ Sandbox mode: Marcando transacción como APPROVED automáticamente');
          transaction.status = 'APPROVED';
          transaction.status_message = 'Aprobado automáticamente en modo Sandbox';
        }
      }

      switch (transaction.status) {
        case 'APPROVED':
        case 'PENDING':
          return transaction;
        case 'ERROR':
        case 'DECLINED':
          const errorMsg = transaction.status_message || 'Transacción Bancolombia rechazada';
          this.logger.error(`❌ Transacción rechazada: ${errorMsg}`);
          throw new Error(errorMsg);
        default:
          this.logger.warn(`⚠️ Estado desconocido: ${transaction.status}`);
          return transaction;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error creating Bancolombia transaction: ${errorMessage}`);
      throw error;
    }
  }

  async getTransaction(transactionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/transactions/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${this.publicKey}`,  // Consultas pueden usar llave pública
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      this.logger.error('Error getting transaction:', error);
      throw error;
    }
  }

  /**
   * Cancela una transacción en Wompi (si es posible)
   * Nota: Wompi no permite cancelar transacciones directamente,
   * pero podemos marcarla como cancelada en nuestro sistema
   */
  async cancelTransaction(transactionId: string): Promise<any> {
    try {
      this.logger.log(`🚫 Intentando cancelar transacción: ${transactionId}`);
      
      // Primero verificar el estado actual
      let transaction;
      try {
        transaction = await this.getTransaction(transactionId);
      } catch (getError) {
        this.logger.warn(`⚠️ No se pudo obtener transacción ${transactionId}:`, getError.message);
        // Si no se puede obtener la transacción, asumimos que se puede cancelar
        return {
          id: transactionId,
          status: 'CANCELLED',
          message: 'Transacción cancelada por el usuario (no se pudo verificar estado)'
        };
      }
      
      // Permitir cancelación para estados PENDING, DECLINED, ERROR
      if (['PENDING', 'DECLINED', 'ERROR'].includes(transaction.status)) {
        this.logger.log(`✅ Transacción ${transactionId} con estado ${transaction.status} - marcando como cancelada`);
        return {
          id: transactionId,
          status: 'CANCELLED',
          message: 'Transacción cancelada por el usuario',
          originalStatus: transaction.status
        };
      } else if (transaction.status === 'APPROVED') {
        this.logger.warn(`⚠️ Transacción ${transactionId} ya fue aprobada - no se puede cancelar`);
        return {
          id: transactionId,
          status: 'APPROVED',
          message: 'La transacción ya fue aprobada y no se puede cancelar',
          originalStatus: transaction.status
        };
      } else {
        this.logger.warn(`⚠️ Estado desconocido para transacción ${transactionId}: ${transaction.status}`);
        return {
          id: transactionId,
          status: 'CANCELLED',
          message: 'Transacción cancelada por el usuario',
          originalStatus: transaction.status
        };
      }
    } catch (error) {
      this.logger.error('❌ Error cancelling transaction:', error.message || error);
      // En lugar de lanzar error, devolver respuesta de cancelación
      return {
        id: transactionId,
        status: 'CANCELLED',
        message: 'Transacción cancelada por el usuario (con errores)',
        error: error.message
      };
    }
  }

  /**
   * Crea una transacción con tarjeta tokenizada
   */
  async createCardTransaction(paymentData: {
    amount_in_cents: number;
    currency: string;
    customer_email: string;
    reference?: string;
    token: string;
    installments: number;
  }) {
    try {
      this.logger.log('💳 Creando transacción con tarjeta...');
      
      // Obtener tokens de aceptación (OBLIGATORIO)
      const tokens = await this.getAcceptanceTokens();
      
      // Generar referencia única si no se proporciona
      const finalReference = paymentData.reference || this.generateUniqueReference('CARD');
      
      const requestBody = {
        acceptance_token: tokens.acceptance_token,
        accept_personal_auth: tokens.accept_personal_auth,
        amount_in_cents: paymentData.amount_in_cents,
        currency: paymentData.currency,
        signature: this.generateSignature(finalReference, paymentData.amount_in_cents, paymentData.currency),
        customer_email: paymentData.customer_email,
        reference: finalReference,
        payment_method: {
          type: 'CARD',
          installments: paymentData.installments,
          token: paymentData.token
        }
      };

      this.logger.log('📤 Enviando datos a Wompi:', {
        ...requestBody,
        acceptance_token: requestBody.acceptance_token.substring(0, 20) + '...',
        accept_personal_auth: requestBody.accept_personal_auth.substring(0, 20) + '...',
        signature: requestBody.signature.substring(0, 16) + '...',
        payment_method: {
          ...requestBody.payment_method,
          token: requestBody.payment_method.token.substring(0, 20) + '...'
        }
      });

      const response = await fetch(`${this.apiUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.privateKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      this.logger.log('📥 Response de Wompi:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        this.logger.error(`❌ HTTP Error ${response.status}:`, data);
        
        if (response.status === 422 && data.error?.type === 'INPUT_VALIDATION_ERROR') {
          const errorMessages = data.error.messages;
          this.logger.error('❌ Errores de validación:', errorMessages);
          throw new Error(`Error de validación: ${JSON.stringify(errorMessages)}`);
        }
        
        throw new Error(data.error?.reason || `Error HTTP ${response.status}`);
      }

      if (data.error) {
        this.logger.error('❌ Wompi Card Transaction Error:', data.error);
        throw new Error(data.error.reason || 'Error en transacción con tarjeta');
      }

      const transaction = data.data;
      this.logger.log(`✅ Transacción con tarjeta creada: ${transaction.id} - Estado: ${transaction.status}`);
      
      return transaction;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error creating card transaction: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Genera la firma de integridad para Wompi
   */
  private generateSignature(reference: string, amountInCents: number, currency: string): string {
    const integritySecret = this.configService.get<string>('WOMPI_INTEGRITY_SECRET');
    if (!integritySecret) {
      throw new Error('WOMPI_INTEGRITY_SECRET no configurado');
    }

    const concatenated = `${reference}${amountInCents}${currency}${integritySecret}`;
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(concatenated).digest('hex');
  }

  /**
   * Obtiene la lista de bancos PSE disponibles
   */
  async getPSEBanks(): Promise<Array<{ financial_institution_code: string; financial_institution_name: string }>> {
    try {
      this.logger.log('🏦 Obteniendo bancos PSE...');

      const response = await fetch(`${this.apiUrl}/pse/financial_institutions`, {
        headers: {
          'Authorization': `Bearer ${this.publicKey}`,  // Consultas públicas usan llave pública
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.logger.log(`✅ ${data.data.length} bancos PSE obtenidos`);
      
      return data.data;
    } catch (error) {
      this.logger.error('❌ Error getting PSE banks:', error);
      throw error;
    }
  }
}
