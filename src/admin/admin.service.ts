import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';

export interface DashboardMetrics {
  totalRevenue: number;              // Ingresos totales de la plataforma
  totalCommissions: number;          // Comisiones totales cobradas
  totalWompiCosts: number;           // Costos totales de Wompi
  netProfit: number;                 // Ganancia neta (comisiones - costos Wompi)
  totalOrders: number;               // Total de pedidos
  completedOrders: number;           // Pedidos completados
  activeProviders: number;           // Proveedores activos
  activeClients: number;             // Clientes activos
  avgOrderValue: number;             // Valor promedio de pedido
  avgCommissionPercent: number;      // Porcentaje promedio de comisión
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  commissions: number;
  wompiCosts: number;
  netProfit: number;
}

export interface TopProvider {
  id: string;
  name: string;
  totalRevenue: number;
  totalOrders: number;
  avgRating: number;
  commissionsGenerated: number;
}

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private pricingService: PricingService,
  ) {}

  /**
   * Obtiene métricas generales del dashboard
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    // Obtener todos los pedidos completados y pagados
    const paidOrders = await this.prisma.order.findMany({
      where: {
        paymentStatus: 'PAID',
      },
      include: {
        encargado: true,
      },
    });

    const completedOrders = paidOrders.filter(o => o.status === 'COMPLETED');
    
    // Calcular totales
    let totalRevenue = 0;
    let totalCommissions = 0;
    let totalWompiCosts = 0;

    for (const order of paidOrders) {
      // Si tiene los nuevos campos, usarlos
      if (order.platformEarnings && order.wompiCost) {
        totalCommissions += order.platformEarnings;
        totalWompiCosts += order.wompiCost;
        totalRevenue += order.totalPrice || order.price;
      } else {
        // Calcular en tiempo real para pedidos antiguos
        const breakdown = this.pricingService.calculatePricingLocal(order.price);
        totalCommissions += breakdown.platformEarnings;
        totalWompiCosts += breakdown.wompiCost;
        totalRevenue += breakdown.totalPrice;
      }
    }

    // La plataforma NO paga los costos de Wompi (los pagan cliente y proveedor 50/50)
    // Por lo tanto, la ganancia neta = comisiones totales
    const netProfit = totalCommissions;

    // Contar proveedores y clientes activos (con al menos 1 pedido)
    const activeProviders = await this.prisma.encargado.count({
      where: {
        orders: {
          some: {
            paymentStatus: 'PAID',
          },
        },
      },
    });

    const activeClients = await this.prisma.user.count({
      where: {
        orders: {
          some: {
            paymentStatus: 'PAID',
          },
        },
      },
    });

    const avgOrderValue = paidOrders.length > 0 
      ? totalRevenue / paidOrders.length 
      : 0;

    const avgCommissionPercent = paidOrders.length > 0
      ? (totalCommissions / (totalRevenue - totalCommissions)) * 100
      : 0;

    return {
      totalRevenue,
      totalCommissions,
      totalWompiCosts,
      netProfit,
      totalOrders: paidOrders.length,
      completedOrders: completedOrders.length,
      activeProviders,
      activeClients,
      avgOrderValue,
      avgCommissionPercent,
    };
  }

  /**
   * Obtiene ingresos mensuales de los últimos 6 meses
   */
  async getMonthlyRevenue(months: number = 6): Promise<MonthlyRevenue[]> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - months);

    const orders = await this.prisma.order.findMany({
      where: {
        paymentStatus: 'PAID',
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Agrupar por mes
    const monthlyData: { [key: string]: MonthlyRevenue } = {};

    orders.forEach(order => {
      const monthKey = order.createdAt.toISOString().substring(0, 7); // YYYY-MM
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          revenue: 0,
          commissions: 0,
          wompiCosts: 0,
          netProfit: 0,
        };
      }

      // Calcular valores
      if (order.platformEarnings && order.wompiCost && order.totalPrice) {
        monthlyData[monthKey].revenue += order.totalPrice;
        monthlyData[monthKey].commissions += order.platformEarnings;
        monthlyData[monthKey].wompiCosts += order.wompiCost;
      } else {
        const breakdown = this.pricingService.calculatePricingLocal(order.price);
        monthlyData[monthKey].revenue += breakdown.totalPrice;
        monthlyData[monthKey].commissions += breakdown.platformEarnings;
        monthlyData[monthKey].wompiCosts += breakdown.wompiCost;
      }

      monthlyData[monthKey].netProfit = 
        monthlyData[monthKey].commissions - monthlyData[monthKey].wompiCosts;
    });

    return Object.values(monthlyData);
  }

  /**
   * Obtiene top proveedores por ingresos generados
   */
  async getTopProviders(limit: number = 10): Promise<TopProvider[]> {
    const providers = await this.prisma.encargado.findMany({
      include: {
        orders: {
          where: {
            paymentStatus: 'PAID',
          },
        },
      },
    });

    const providerStats = providers.map(provider => {
      const totalRevenue = provider.orders.reduce((sum, order) => {
        return sum + (order.totalPrice || order.price);
      }, 0);

      const commissionsGenerated = provider.orders.reduce((sum, order) => {
        if (order.platformEarnings) {
          return sum + order.platformEarnings;
        } else {
          const breakdown = this.pricingService.calculatePricingLocal(order.price);
          return sum + breakdown.platformEarnings;
        }
      }, 0);

      return {
        id: provider.id,
        name: provider.name,
        totalRevenue,
        totalOrders: provider.orders.length,
        avgRating: provider.rating,
        commissionsGenerated,
      };
    });

    return providerStats
      .sort((a, b) => b.commissionsGenerated - a.commissionsGenerated)
      .slice(0, limit);
  }

  /**
   * Obtiene estadísticas de métodos de pago
   */
  async getPaymentMethodStats() {
    const orders = await this.prisma.order.findMany({
      where: {
        paymentStatus: 'PAID',
      },
    });

    const stats: { [key: string]: { count: number; revenue: number } } = {};

    orders.forEach(order => {
      const method = order.paymentMethod || 'unknown';
      if (!stats[method]) {
        stats[method] = { count: 0, revenue: 0 };
      }
      stats[method].count++;
      stats[method].revenue += order.totalPrice || order.price;
    });

    return Object.entries(stats).map(([method, data]) => ({
      method,
      count: data.count,
      revenue: data.revenue,
      percentage: (data.count / orders.length) * 100,
    }));
  }

  /**
   * Actualiza configuración de comisión global
   */
  async updateCommissionConfig(marginPercent: number, minMargin: number) {
    // Aquí podrías guardar en una tabla de configuración
    // Por ahora retornamos la confirmación
    return {
      marginPercent,
      minMargin,
      updatedAt: new Date(),
    };
  }

  /**
   * Obtiene todos los usuarios (clientes y proveedores)
   */
  async getAllUsers() {
    const clients = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        verified: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    const providers = await this.prisma.encargado.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        verified: true,
        available: true,
        rating: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    return {
      clients,
      providers,
    };
  }
}
