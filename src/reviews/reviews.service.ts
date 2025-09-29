import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { EncargadosService } from '../encargados/encargados.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private encargadosService: EncargadosService,
  ) {}

  async create(createReviewDto: CreateReviewDto, userId: string) {
    // Verificar que el pedido existe y está completado
    const order = await this.prisma.order.findUnique({
      where: { id: createReviewDto.orderId },
      include: { review: true },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (order.userId !== userId) {
      throw new BadRequestException('No tienes permiso para calificar este pedido');
    }

    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException('Solo puedes calificar pedidos completados');
    }

    if (order.review) {
      throw new BadRequestException('Este pedido ya ha sido calificado');
    }

    const review = await this.prisma.review.create({
      data: {
        ...createReviewDto,
        userId,
        encargadoId: order.encargadoId,
      },
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
    });

    // Actualizar el rating del encargado
    await this.encargadosService.updateRating(order.encargadoId);

    return review;
  }

  async findAll(encargadoId?: string) {
    const where: any = {};

    if (encargadoId) {
      where.encargadoId = encargadoId;
    }

    return this.prisma.review.findMany({
      where,
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
        encargado: {
          select: {
            id: true,
            name: true,
            avatar: true,
            service: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
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
        encargado: {
          select: {
            id: true,
            name: true,
            avatar: true,
            service: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Reseña no encontrada');
    }

    return review;
  }

  async update(id: string, updateReviewDto: UpdateReviewDto, userId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Reseña no encontrada');
    }

    if (review.userId !== userId) {
      throw new BadRequestException('No tienes permiso para editar esta reseña');
    }

    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: updateReviewDto,
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
    });

    // Actualizar el rating del encargado
    await this.encargadosService.updateRating(review.encargadoId);

    return updatedReview;
  }

  async remove(id: string, userId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Reseña no encontrada');
    }

    if (review.userId !== userId) {
      throw new BadRequestException('No tienes permiso para eliminar esta reseña');
    }

    await this.prisma.review.delete({
      where: { id },
    });

    // Actualizar el rating del encargado
    await this.encargadosService.updateRating(review.encargadoId);

    return { message: 'Reseña eliminada exitosamente' };
  }

  async getReviewStats(encargadoId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { encargadoId },
    });

    if (reviews.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0,
        },
      };
    }

    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;

    const ratingDistribution = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length,
    };

    return {
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution,
    };
  }
}
