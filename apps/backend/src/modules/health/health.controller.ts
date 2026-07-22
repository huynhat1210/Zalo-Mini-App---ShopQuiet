import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async check() {
    const checks = {
      database: 'disconnected',
      cache: 'disconnected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };

    // Check database connection
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'connected';
    } catch (error) {
      checks.database = 'disconnected';
    }

    // Check cache connection
    try {
      await this.cacheManager.set('health_check', 'ok', 5);
      await this.cacheManager.del('health_check');
      checks.cache = 'connected';
    } catch (error) {
      checks.cache = 'disconnected';
    }

    const isHealthy =
      checks.database === 'connected' && checks.cache === 'connected';

    return {
      status: isHealthy ? 'ok' : 'error',
      ...checks,
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service not ready' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      await this.cacheManager.set('ready_check', 'ok', 5);
      await this.cacheManager.del('ready_check');

      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async live() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check endpoint' })
  @ApiResponse({ status: 200, description: 'Detailed service health' })
  async detailed() {
    const checks = {
      database: 'disconnected',
      cache: 'disconnected',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    };

    // Check database connection with timing
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'connected';
      (checks as any).databaseLatency = `${Date.now() - dbStart}ms`;
    } catch (error) {
      checks.database = 'disconnected';
      (checks as any).databaseError =
        error instanceof Error ? error.message : 'Unknown error';
    }

    // Check cache connection with timing
    const cacheStart = Date.now();
    try {
      await this.cacheManager.set('detailed_check', 'ok', 5);
      await this.cacheManager.del('detailed_check');
      checks.cache = 'connected';
      (checks as any).cacheLatency = `${Date.now() - cacheStart}ms`;
    } catch (error) {
      checks.cache = 'disconnected';
      (checks as any).cacheError =
        error instanceof Error ? error.message : 'Unknown error';
    }

    const isHealthy =
      checks.database === 'connected' && checks.cache === 'connected';

    return {
      status: isHealthy ? 'ok' : 'error',
      ...checks,
    };
  }
}
