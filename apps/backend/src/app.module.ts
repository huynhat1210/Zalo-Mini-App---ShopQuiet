import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UsersModule } from './modules/users/users.module';
import { CartModule } from './modules/cart/cart.module';
import { CommentsModule } from './modules/comments/comments.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { VouchersModule } from './modules/vouchers/vouchers.module';
import { BannersModule } from './modules/banners/banners.module';
import { CmsModule } from './modules/cms/cms.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MediaModule } from './modules/media/media.module';
import { ChatModule } from './modules/chat/chat.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from './common/logger/logger.module';

@Module({
  imports: [
    MediaModule,
    LoggerModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        ttl: 10000, // 10 seconds
        limit: 20, // 20 requests per 10 seconds
      },
    ]),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        // Only use Redis if REDIS_HOST is provided (for production)
        if (process.env.REDIS_HOST) {
          const redisConfig: any = {
            socket: {
              host: process.env.REDIS_HOST,
              port: parseInt(process.env.REDIS_PORT || '6379', 10),
            },
          };

          // Add password if provided
          if (process.env.REDIS_PASSWORD) {
            redisConfig.password = process.env.REDIS_PASSWORD;
          }

          return {
            store: await redisStore(redisConfig),
          };
        }
        // Use in-memory cache for development/Render without Redis
        return {
          store: 'memory',
          ttl: 600, // 10 minutes default TTL
        };
      },
    }),
    PrismaModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
    NotificationsModule,
    UsersModule,
    CartModule,
    CommentsModule,
    AddressesModule,
    FavoritesModule,
    VouchersModule,
    BannersModule,
    CmsModule,
    HealthModule,
    ChatModule,
    WebsocketModule,
    AnalyticsModule,
    RecommendationsModule,
    GamificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
