import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EncargadosModule } from './encargados/encargados.module';
import { CategoriesModule } from './categories/categories.module';
import { OrdersModule } from './orders/orders.module';
import { ReviewsModule } from './reviews/reviews.module';
import { PromotionsModule } from './promotions/promotions.module';
import { FavoritesModule } from './favorites/favorites.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    EncargadosModule,
    CategoriesModule,
    OrdersModule,
    ReviewsModule,
    PromotionsModule,
    FavoritesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
