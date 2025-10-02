import { Module } from '@nestjs/common';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [BannersController],
  providers: [BannersService, PrismaService],
  exports: [BannersService],
})
export class BannersModule {}
