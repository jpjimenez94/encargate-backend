import { Controller, Get, Query } from '@nestjs/common';
import { PricingService, PricingBreakdown } from './pricing.service';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('calculate')
  calculatePricing(
    @Query('servicePrice') servicePrice: string,
    @Query('marginPercent') marginPercent?: string,
  ): PricingBreakdown {
    const price = parseFloat(servicePrice);
    const margin = marginPercent ? parseFloat(marginPercent) : undefined;
    
    return this.pricingService.calculatePricing(price, margin);
  }
  
  @Get('wompi-cost')
  calculateWompiCost(
    @Query('amount') amount: string,
  ): { amount: number; wompiCost: number } {
    const amountNum = parseFloat(amount);
    const wompiCost = this.pricingService.calculateWompiCost(amountNum);
    
    return {
      amount: amountNum,
      wompiCost,
    };
  }
}
