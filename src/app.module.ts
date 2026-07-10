import { randomUUID } from 'crypto';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { ActivityModule } from './activity/activity.module';
import { ForumModule } from './forum/forum.module';
import { ToolsModule } from './tools/tools.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req) => (req as any).headers['x-request-id'] || randomUUID(),
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
      },
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: (parseInt(config.get<string>('THROTTLE_TTL', '60'), 10) || 60) * 1000,
          limit: parseInt(config.get<string>('THROTTLE_LIMIT', '60'), 10) || 60,
        },
      ],
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    HealthModule,
    MetricsModule,
    ActivityModule,
    ForumModule,
    ToolsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
