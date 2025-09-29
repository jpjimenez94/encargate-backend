import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async create(createFavoriteDto: CreateFavoriteDto, userId: string) {
    // Verificar que el encargado existe
    const encargado = await this.prisma.encargado.findUnique({
      where: { id: createFavoriteDto.encargadoId },
    });

    if (!encargado) {
      throw new NotFoundException('Encargado no encontrado');
    }

    // Verificar que no existe ya en favoritos
    const existingFavorite = await this.prisma.favorite.findUnique({
      where: {
        userId_encargadoId: {
          userId,
          encargadoId: createFavoriteDto.encargadoId,
        },
      },
    });

    if (existingFavorite) {
      throw new ConflictException('El encargado ya está en favoritos');
    }

    return this.prisma.favorite.create({
      data: {
        userId,
        encargadoId: createFavoriteDto.encargadoId,
      },
      include: {
        encargado: {
          select: {
            id: true,
            name: true,
            avatar: true,
            service: true,
            rating: true,
            price: true,
            location: true,
            available: true,
          },
        },
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: {
        encargado: {
          select: {
            id: true,
            name: true,
            avatar: true,
            service: true,
            rating: true,
            price: true,
            location: true,
            available: true,
            category: {
              select: {
                id: true,
                name: true,
                icon: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const favorite = await this.prisma.favorite.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        encargado: {
          select: {
            id: true,
            name: true,
            avatar: true,
            service: true,
            rating: true,
            price: true,
            location: true,
            available: true,
            category: {
              select: {
                id: true,
                name: true,
                icon: true,
                color: true,
              },
            },
          },
        },
      },
    });

    if (!favorite) {
      throw new NotFoundException('Favorito no encontrado');
    }

    return favorite;
  }

  async remove(encargadoId: string, userId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_encargadoId: {
          userId,
          encargadoId,
        },
      },
    });

    if (!favorite) {
      throw new NotFoundException('Favorito no encontrado');
    }

    await this.prisma.favorite.delete({
      where: {
        userId_encargadoId: {
          userId,
          encargadoId,
        },
      },
    });

    return { message: 'Favorito eliminado exitosamente' };
  }

  async toggle(encargadoId: string, userId: string) {
    const existingFavorite = await this.prisma.favorite.findUnique({
      where: {
        userId_encargadoId: {
          userId,
          encargadoId,
        },
      },
    });

    if (existingFavorite) {
      // Eliminar de favoritos
      await this.prisma.favorite.delete({
        where: {
          userId_encargadoId: {
            userId,
            encargadoId,
          },
        },
      });

      return { 
        message: 'Eliminado de favoritos',
        isFavorite: false,
      };
    } else {
      // Agregar a favoritos
      await this.create({ encargadoId }, userId);

      return { 
        message: 'Agregado a favoritos',
        isFavorite: true,
      };
    }
  }

  async isFavorite(encargadoId: string, userId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_encargadoId: {
          userId,
          encargadoId,
        },
      },
    });

    return { isFavorite: !!favorite };
  }
}
