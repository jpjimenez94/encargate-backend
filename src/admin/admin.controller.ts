import { Controller, Get, Put, Body, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), AdminGuard) // Proteger todas las rutas con autenticación y rol ADMIN
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * GET /api/admin/dashboard
   * Obtiene métricas generales del dashboard
   */
  @Get('dashboard')
  async getDashboardMetrics() {
    return await this.adminService.getDashboardMetrics();
  }

  /**
   * GET /api/admin/revenue/monthly?months=6
   * Obtiene ingresos mensuales
   */
  @Get('revenue/monthly')
  async getMonthlyRevenue(@Query('months') months?: string) {
    const monthsNum = months ? parseInt(months) : 6;
    return await this.adminService.getMonthlyRevenue(monthsNum);
  }

  /**
   * GET /api/admin/providers/top?limit=10
   * Obtiene top proveedores por comisiones generadas
   */
  @Get('providers/top')
  async getTopProviders(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit) : 10;
    return await this.adminService.getTopProviders(limitNum);
  }

  /**
   * GET /api/admin/payment-methods/stats
   * Obtiene estadísticas de métodos de pago
   */
  @Get('payment-methods/stats')
  async getPaymentMethodStats() {
    return await this.adminService.getPaymentMethodStats();
  }

  /**
   * GET /api/admin/users
   * Obtiene todos los usuarios (clientes y proveedores)
   */
  @Get('users')
  async getAllUsers() {
    return await this.adminService.getAllUsers();
  }

  /**
   * PUT /api/admin/commission/config
   * Actualiza configuración de comisiones
   */
  @Put('commission/config')
  async updateCommissionConfig(
    @Body() body: { marginPercent: number; minMargin: number },
  ) {
    return await this.adminService.updateCommissionConfig(
      body.marginPercent,
      body.minMargin,
    );
  }
}
