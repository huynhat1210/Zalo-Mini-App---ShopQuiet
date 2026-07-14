import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class BannersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll() {
    const cacheKey = 'banners_all';
    const cachedData = await this.cacheManager.get(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    const payloadUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL?.trim();
    let banners: any[] = [];

    if (payloadUrl) {
      try {
        const response = await fetch(`${payloadUrl}/api/cms/banners`);
        if (response.ok) {
          const payload = await response.json();
          const items = Array.isArray(payload) ? payload : payload?.docs ?? [];
          if (items.length) {
            banners = items.map((item: any) => {
              if (item && item.image && typeof item.image === 'object') {
                const imgUrl = item.image.url || '';
                const finalUrl = imgUrl.startsWith('http')
                  ? imgUrl
                  : `${payloadUrl}${imgUrl}`;
                return {
                  ...item,
                  imageUrl: finalUrl,
                };
              }
              return item;
            });
          }
        }
      } catch (error) {
        console.error('Failed to load banners from Payload CMS:', error);
      }
    }

    if (banners.length === 0) {
      banners = await this.prisma.banner.findMany({
        where: { active: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Cache for 5 minutes (300000ms) - banners change infrequently
    await this.cacheManager.set(cacheKey, banners, 300000);
    return banners;
  }

  async invalidateCache() {
    await this.cacheManager.del('banners_all');
  }
}
