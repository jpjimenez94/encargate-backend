import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async create(createPromotionDto: CreatePromotionDto) {
    return this.prisma.promotion.create({
      data: createPromotionDto,
    });
  }

  async findAll(category?: string, active?: boolean) {
    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (active !== undefined) {
      where.active = active;
    }

    return this.prisma.promotion.findMany({
      where,
      orderBy: [
        { active: 'desc' },
        { discount: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findActive() {
    return this.prisma.promotion.findMany({
      where: {
        active: true,
        validUntil: {
          gte: new Date(),
        },
      },
      orderBy: {
        discount: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
    });

    if (!promotion) {
      throw new NotFoundException('Promoción no encontrada');
    }

    return promotion;
  }

  async update(id: string, updatePromotionDto: UpdatePromotionDto) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
    });

    if (!promotion) {
      throw new NotFoundException('Promoción no encontrada');
    }

    return this.prisma.promotion.update({
      where: { id },
      data: updatePromotionDto,
    });
  }

  async remove(id: string) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
    });

    if (!promotion) {
      throw new NotFoundException('Promoción no encontrada');
    }

    return this.prisma.promotion.delete({
      where: { id },
    });
  }

  async toggleActive(id: string) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
    });

    if (!promotion) {
      throw new NotFoundException('Promoción no encontrada');
    }

    return this.prisma.promotion.update({
      where: { id },
      data: {
        active: !promotion.active,
      },
    });
  }
}
