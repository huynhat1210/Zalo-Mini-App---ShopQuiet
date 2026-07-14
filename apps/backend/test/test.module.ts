import { Module } from '@nestjs/common';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { FavoritesModule } from '../src/modules/favorites/favorites.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    CacheModule.register({
      isGlobal: true,
      store: 'memory',
    }),
    JwtModule.register({
      secret: 'test-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    FavoritesModule,
  ],
})
export class TestModule {}
