import { Injectable } from '@nestjs/common';

export interface PricingBreakdown {
  // Precio base
  servicePrice: number;           // P - Precio base del servicio
  
  // Comisión Wompi
  wompiPercent: number;           // 2.65%
  wompiFixed: number;             // $700
  wompiSubtotal: number;          // Percent + Fixed
  wompiIVA: number;               // 19% sobre subtotal
  wompiCost: number;              // Cw - Costo total de Wompi
  wompiCostClient: number;        // Cw/2 - Lo que paga el cliente
  wompiCostProvider: number;      // Cw/2 - Lo que paga el proveedor
  
  // Margen de plataforma
  platformMargin: number;         // Mg - Ganancia de la plataforma
  platformMarginPercent: number;  // % configurado
  
  // Precios finales
  totalPrice: number;             // Pc = P + Mg + (Cw/2) - Lo que paga el cliente
  providerEarnings: number;       // Pp = P - (Cw/2) - Lo que recibe el proveedor
  platformEarnings: number;       // = Mg - Ganancia neta de la plataforma
}

@Injectable()
export class PricingService {
  // Configuración
  private readonly WOMPI_PERCENT = 0.0265;  // 2.65%
  private readonly WOMPI_FIXED = 700;       // $700 COP
  private readonly WOMPI_IVA = 0.19;        // 19%
  
  // Margen por defecto (puede configurarse por categoría/proveedor)
  private readonly DEFAULT_MARGIN_PERCENT = 5;  // 5%
  private readonly MIN_MARGIN = 2000;           // Mínimo $2,000 COP
  
  /**
   * Calcula el desglose de precios con estrategia mixta
   * @param servicePrice Precio base del servicio (P)
   * @param marginPercent Porcentaje de margen deseado (opcional)
   */
  calculatePricing(
    servicePrice: number, 
    marginPercent?: number
  ): PricingBreakdown {
    // Margen de la plataforma
    const marginPercentToUse = marginPercent || this.DEFAULT_MARGIN_PERCENT;
    let platformMargin = servicePrice * (marginPercentToUse / 100);
    
    // Garantizar margen mínimo
    if (platformMargin < this.MIN_MARGIN) {
      platformMargin = this.MIN_MARGIN;
    }
    
    // Calcular costo de Wompi sobre el precio base + margen
    const baseAmount = servicePrice + platformMargin;
    const wompiPercent = baseAmount * this.WOMPI_PERCENT;
    const wompiSubtotal = wompiPercent + this.WOMPI_FIXED;
    const wompiIVA = wompiSubtotal * this.WOMPI_IVA;
    const wompiCost = wompiSubtotal + wompiIVA;
    
    // ESTRATEGIA MIXTA: dividir costo de Wompi
    const wompiCostClient = wompiCost / 2;
    const wompiCostProvider = wompiCost / 2;
    
    // Precios finales
    const totalPrice = servicePrice + platformMargin + wompiCostClient;
    const providerEarnings = servicePrice - wompiCostProvider;
    const platformEarnings = platformMargin; // Ganancia neta
    
    return {
      servicePrice,
      
      wompiPercent,
      wompiFixed: this.WOMPI_FIXED,
      wompiSubtotal,
      wompiIVA,
      wompiCost,
      wompiCostClient,
      wompiCostProvider,
      
      platformMargin,
      platformMarginPercent: marginPercentToUse,
      
      totalPrice,
      providerEarnings,
      platformEarnings,
    };
  }
  
  /**
   * Calcula solo el costo de Wompi para un monto dado
   */
  calculateWompiCost(amount: number): number {
    const wompiPercent = amount * this.WOMPI_PERCENT;
    const wompiSubtotal = wompiPercent + this.WOMPI_FIXED;
    const wompiIVA = wompiSubtotal * this.WOMPI_IVA;
    return wompiSubtotal + wompiIVA;
  }

  /**
   * Calcula el desglose de precios localmente (sin llamar al endpoint)
   * Útil para cálculos en backend sin round-trip HTTP
   */
  calculatePricingLocal(
    servicePrice: number,
    marginPercent?: number
  ): PricingBreakdown {
    return this.calculatePricing(servicePrice, marginPercent);
  }
  
  /**
   * Formatea un desglose para mostrar al cliente
   */
  formatBreakdownForClient(breakdown: PricingBreakdown): string {
    return `
Precio del servicio: $${breakdown.servicePrice.toLocaleString('es-CO')}
Comisión de plataforma: $${breakdown.platformMargin.toLocaleString('es-CO')}
Costo de transacción: $${breakdown.wompiCostClient.toLocaleString('es-CO')}
─────────────────────────────
TOTAL A PAGAR: $${breakdown.totalPrice.toLocaleString('es-CO')}
    `.trim();
  }
}
