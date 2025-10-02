import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        phone: true,
        location: true,
        verified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        phone: true,
        location: true,
        verified: true,
        createdAt: true,
        updatedAt: true,
        orders: {
          include: {
            encargado: {
              select: {
                id: true,
                name: true,
                avatar: true,
                service: true,
              },
            },
            review: true,
          },
        },
        favorites: {
          include: {
            encargado: {
              select: {
                id: true,
                name: true,
                avatar: true,
                service: true,
                rating: true,
                price: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Mapear avatarUrl a avatar si existe
    const { avatarUrl, ...rest } = updateUserDto as any;
    const dataToUpdate = {
      ...rest,
      ...(avatarUrl && { avatar: avatarUrl }),
    };

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        phone: true,
        location: true,
        verified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Mapear avatar a avatarUrl para el frontend
    return {
      ...updatedUser,
      avatarUrl: updatedUser.avatar,
    };
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.prisma.user.delete({
      where: { id },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }
}
