import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEncargadoDto } from './dto/update-encargado.dto';

@Injectable()
export class EncargadosService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    categoryId?: string, 
    search?: string, 
    available?: boolean, 
    sortBy?: string, 
    limit?: number, 
    offset?: number,
    service?: string
  ) {
    const where: any = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (available !== undefined) {
      where.available = available;
    }

    if (service) {
      where.OR = [
        { service: { equals: service, mode: 'insensitive' } },
        { services: { has: service } }
      ];
    }

    if (search) {
      const searchConditions = [
        { name: { contains: search, mode: 'insensitive' } },
        { service: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
      
      if (where.OR) {
        // Si ya hay condiciones OR (por servicio), combinar con AND
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions }
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    return this.prisma.encargado.findMany({
      where,
      include: {
        category: true,
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
        _count: {
          select: {
            orders: true,
            reviews: true,
          },
        },
      },
      orderBy: sortBy === 'price' 
        ? [{ price: 'asc' }]
        : sortBy === 'reviews'
        ? [{ reviewsCount: 'desc' }]
        : [{ rating: 'desc' }, { reviewsCount: 'desc' }],
      ...(limit && { take: limit }),
      ...(offset && { skip: offset }),
    });
  }

  async findOne(id: string) {
    const encargado = await this.prisma.encargado.findUnique({
      where: { id },
      include: {
        category: true,
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            order: {
              select: {
                id: true,
                service: true,
                date: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        orders: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        _count: {
          select: {
            orders: true,
            reviews: true,
            favorites: true,
          },
        },
      },
    });

    if (!encargado) {
      throw new NotFoundException('Encargado no encontrado');
    }

    return encargado;
  }

  async update(id: string, updateEncargadoDto: UpdateEncargadoDto) {
    const encargado = await this.prisma.encargado.findUnique({
      where: { id },
    });

    if (!encargado) {
      throw new NotFoundException('Encargado no encontrado');
    }

    return this.prisma.encargado.update({
      where: { id },
      data: updateEncargadoDto,
      include: {
        category: true,
      },
    });
  }

  async remove(id: string) {
    const encargado = await this.prisma.encargado.findUnique({
      where: { id },
    });

    if (!encargado) {
      throw new NotFoundException('Encargado no encontrado');
    }

    return this.prisma.encargado.delete({
      where: { id },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.encargado.findUnique({
      where: { email },
    });
  }

  async updateRating(encargadoId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { encargadoId },
    });

    if (reviews.length === 0) return;

    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    await this.prisma.encargado.update({
      where: { id: encargadoId },
      data: {
        rating: Math.round(averageRating * 10) / 10, // Redondear a 1 decimal
        reviewsCount: reviews.length,
      },
    });
  }

  async toggleAvailability(id: string) {
    const encargado = await this.prisma.encargado.findUnique({
      where: { id },
    });

    if (!encargado) {
      throw new NotFoundException('Encargado no encontrado');
    }

    return this.prisma.encargado.update({
      where: { id },
      data: {
        available: !encargado.available,
      },
    });
  }
}
