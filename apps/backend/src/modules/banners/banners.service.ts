import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BannersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const payloadUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL?.trim();
    if (payloadUrl) {
      try {
        const response = await fetch(`${payloadUrl}/api/cms/banners`);
        if (response.ok) {
          const payload = await response.json();
          const items = Array.isArray(payload) ? payload : payload?.docs ?? [];
          if (items.length) {
            return items.map((item: any) => {
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

    return this.prisma.banner.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
