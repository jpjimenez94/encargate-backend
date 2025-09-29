import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name, role, ...otherData } = registerDto;

    console.log('🔍 Register attempt:', { email, name, role, otherData });

    // Verificar si el usuario ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('❌ User already exists in users table');
      throw new ConflictException('El email ya está registrado');
    }

    // Si es encargado, verificar que no exista en la tabla de encargados
    if (role === Role.ENCARGADO) {
      console.log('🔧 Checking if encargado exists...');
      const existingEncargado = await this.prisma.encargado.findUnique({
        where: { email },
      });

      if (existingEncargado) {
        console.log('❌ Encargado already exists');
        throw new ConflictException('El email ya está registrado como encargado');
      }
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('🔐 Password hashed');

    // Crear usuario
    if (role === Role.CLIENTE) {
      console.log('👤 Creating CLIENTE...');
      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role,
          ...otherData,
        },
      });

      console.log('✅ CLIENTE created:', user.id);
      const { password: _, ...userWithoutPassword } = user;
      return {
        user: userWithoutPassword,
        token: this.generateToken(user.id, user.role),
      };
    } else {
      // Crear encargado
      console.log('🔧 Creating ENCARGADO...');
      console.log('Encargado data:', {
        email,
        name,
        categoryId: otherData.categoryId || 'hogar',
        service: otherData.service || 'Servicio general',
        location: otherData.location || 'Bogotá, Colombia',
        price: otherData.price || 100,
        priceMin: otherData.priceMin || 50,
        priceMax: otherData.priceMax || 200,
        experience: otherData.experience || '1 año',
        description: otherData.description || 'Profesional en servicios',
        services: otherData.services || ['Servicio general'],
      });

      const encargado = await this.prisma.encargado.create({
        data: {
          email,
          password: hashedPassword,
          name,
          categoryId: otherData.categories?.[0] || otherData.categoryId || 'hogar',
          service: otherData.services?.[0] || otherData.service || 'Servicio general',
          location: otherData.location || 'Bogotá, Colombia',
          price: otherData.price || 100,
          priceMin: otherData.priceMin || 50,
          priceMax: otherData.priceMax || 200,
          experience: otherData.experience || '1 año',
          description: otherData.description || 'Profesional en servicios',
          services: otherData.services || ['Servicio general'],
        },
      });

      // Crear relaciones con múltiples categorías
      if (otherData.categories && otherData.categories.length > 0) {
        const categoryRelations = otherData.categories.map(categoryId => ({
          encargadoId: encargado.id,
          categoryId: categoryId,
        }));

        await this.prisma.encargadoCategory.createMany({
          data: categoryRelations,
        });
      }

      console.log('✅ ENCARGADO created:', encargado.id);
      const { password: _, ...encargadoWithoutPassword } = encargado;
      return {
        user: encargadoWithoutPassword,
        token: this.generateToken(encargado.id, Role.ENCARGADO),
      };
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    console.log('🔐 Login attempt:', { email, password: '***' });

    // Buscar primero en usuarios
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    let isEncargado = false;

    // Si no se encuentra en usuarios, buscar en encargados
    if (!user) {
      const encargado = await this.prisma.encargado.findUnique({
        where: { email },
      });

      if (encargado) {
        user = {
          ...encargado,
          role: Role.ENCARGADO,
        } as any;
        isEncargado = true;
      }
    }

    if (!user) {
      console.log('❌ No user found with email:', email);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', email);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    console.log('✅ Login successful for:', email);

    const { password: _, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      token: this.generateToken(user.id, user.role),
      isEncargado,
    };
  }

  async validateUser(userId: string): Promise<any> {
    // Buscar primero en usuarios
    let user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }

    // Si no se encuentra, buscar en encargados
    const encargado = await this.prisma.encargado.findUnique({
      where: { id: userId },
    });

    if (encargado) {
      const { password: _, ...encargadoWithoutPassword } = encargado;
      return {
        ...encargadoWithoutPassword,
        role: Role.ENCARGADO,
      };
    }

    return null;
  }

  private generateToken(userId: string, role: Role): string {
    const payload = { sub: userId, role };
    return this.jwtService.sign(payload);
  }
}
