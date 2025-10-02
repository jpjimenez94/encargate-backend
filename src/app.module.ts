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
import { PaymentsModule } from './payments/payments.module';
import { WompiModule } from './wompi/wompi.module';
import { BannersModule } from './banners/banners.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { PricingModule } from './pricing/pricing.module';
import { AdminModule } from './admin/admin.module';
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
    PaymentsModule,
    WompiModule,
    BannersModule,
    NotificationsModule,
    WebhooksModule,
    PricingModule,
    AdminModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
