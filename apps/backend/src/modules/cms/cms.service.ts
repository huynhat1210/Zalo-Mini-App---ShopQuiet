import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type CmsContentType =
  | 'banners'
  | 'featured_categories'
  | 'news'
  | 'terms'
  | 'policies'
  | 'faq'
  | 'notifications'
  | 'advertisements'
  | 'landing_page';

@Injectable()
export class CmsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureDefaults();
  }

  async ensureDefaults() {
    await this.ensureSiteSettings();
    await this.ensureMenuItems();
    await this.ensureStaticPages();
    await this.ensureShippingMethods();
    await this.ensurePaymentMethods();
  }

  async getContent(type: CmsContentType, limit?: string) {
    const normalizedType = type;
    if (!normalizedType) {
      return [];
    }

    const payloadUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL?.trim();
    if (!payloadUrl) {
      return [];
    }

    try {
      const url = new URL(`${payloadUrl}/api/cms/${normalizedType}`);
      if (limit) {
        url.searchParams.set('limit', String(limit));
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        return [];
      }

      const payload = await response.json();
      let docs: any[] = [];
      if (Array.isArray(payload)) {
        docs = payload;
      } else if (payload && Array.isArray(payload.docs)) {
        docs = payload.docs;
      }

      return docs.map((doc: any) => {
        if (doc && doc.image && typeof doc.image === 'object') {
          const imgUrl = doc.image.url || '';
          const finalUrl = imgUrl.startsWith('http')
            ? imgUrl
            : `${payloadUrl}${imgUrl}`;
          return {
            ...doc,
            imageUrl: finalUrl,
          };
        }
        return doc;
      });
    } catch (error) {
      console.error(`Failed to load Payload CMS content for ${normalizedType}:`, error);
      return [];
    }
  }

  async getSettings() {
    const rows = await this.prisma.siteSetting.findMany({
      where: { active: true },
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });

    return rows.reduce<Record<string, string>>((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
  }

  async getMenuItems(section?: string) {
    return this.prisma.menuItem.findMany({
      where: {
        active: true,
        ...(section ? { section } : {}),
      },
      orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async getStaticPages() {
    return this.prisma.staticPage.findMany({
      where: { active: true },
      orderBy: [{ title: 'asc' }],
    });
  }

  async getStaticPage(slug: string) {
    return this.prisma.staticPage.findFirst({
      where: { slug, active: true },
    });
  }

  async getShippingMethods() {
    return this.prisma.shippingMethod.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async getPaymentMethods() {
    return this.prisma.paymentMethod.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async getBootstrap() {
    const [settings, menuItems, staticPages, shippingMethods, paymentMethods, banners, featuredCategories, news, terms, policies, faq, notifications, advertisements, landingPages] =
      await Promise.all([
        this.getSettings(),
        this.getMenuItems(),
        this.getStaticPages(),
        this.getShippingMethods(),
        this.getPaymentMethods(),
        this.getContent('banners'),
        this.getContent('featured_categories'),
        this.getContent('news'),
        this.getContent('terms'),
        this.getContent('policies'),
        this.getContent('faq'),
        this.getContent('notifications'),
        this.getContent('advertisements'),
        this.getContent('landing_page'),
      ]);

    return {
      settings,
      menuItems,
      staticPages,
      shippingMethods,
      paymentMethods,
      content: {
        banners,
        featuredCategories,
        news,
        terms,
        policies,
        faq,
        notifications,
        advertisements,
        landingPage: landingPages?.[0] ?? null,
      },
    };
  }

  private async ensureSiteSettings() {
    const defaults = [
      {
        key: 'brand.name',
        label: 'Tên thương hiệu',
        value: 'ShopQuiet',
        group: 'brand',
      },
      {
        key: 'brand.slogan',
        label: 'Slogan',
        value: 'Quiet goods for everyday living',
        group: 'brand',
      },
      {
        key: 'brand.story.title',
        label: 'Tiêu đề câu chuyện thương hiệu',
        value: 'Quiet Space',
        group: 'brand',
      },
      {
        key: 'brand.story.content',
        label: 'Nội dung câu chuyện thương hiệu',
        value:
          'Chúng tôi tin vào vẻ đẹp tĩnh lặng, những đường nét gọn gàng và chất liệu thô mộc tự nhiên mang lại cảm giác bình yên trong cuộc sống hằng ngày.',
        type: 'TEXTAREA',
        group: 'brand',
      },
      {
        key: 'brand.story.imageUrl',
        label: 'Ảnh câu chuyện thương hiệu',
        value:
          'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=400&q=80',
        type: 'URL',
        group: 'brand',
      },
      {
        key: 'support.hotline',
        label: 'Hotline',
        value: '1900 6868',
        type: 'PHONE',
        group: 'support',
      },
      {
        key: 'support.email',
        label: 'Email hỗ trợ',
        value: 'support@shopquiet.vn',
        type: 'EMAIL',
        group: 'support',
      },
      {
        key: 'support.returnPolicyShort',
        label: 'Chính sách ngắn',
        value: 'Chính sách đổi trả 7 ngày',
        group: 'support',
      },
      {
        key: 'profile.defaultName',
        label: 'Tên khách mặc định',
        value: 'Alex Johnson',
        group: 'profile',
      },
      {
        key: 'profile.defaultPhone',
        label: 'SĐT mặc định',
        value: '0987654321',
        type: 'PHONE',
        group: 'profile',
      },
      {
        key: 'profile.defaultAvatar',
        label: 'Avatar mặc định',
        value:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        type: 'URL',
        group: 'profile',
      },
    ];

    for (const item of defaults) {
      await this.prisma.siteSetting.upsert({
        where: { key: item.key },
        update: {},
        create: item,
      });
    }
  }

  private async ensureMenuItems() {
    const defaults = [
      {
        section: 'collections',
        label: 'Minimalist Living',
        targetType: 'CATEGORY',
        target: 'home',
        sortOrder: 1,
      },
      {
        section: 'collections',
        label: 'Summer Breathable',
        targetType: 'CATEGORY',
        target: 'clothing',
        sortOrder: 2,
      },
      {
        section: 'collections',
        label: 'Earth Tones Selection',
        targetType: 'CATEGORY',
        target: 'home',
        sortOrder: 3,
      },
      {
        section: 'materials',
        label: '100% Organic Linen',
        targetType: 'TOAST',
        target: '100% Organic Linen',
        sortOrder: 1,
      },
      {
        section: 'materials',
        label: 'Premium Ceramic',
        targetType: 'TOAST',
        target: 'Premium Ceramic',
        sortOrder: 2,
      },
      {
        section: 'materials',
        label: 'Hand-poured Concrete',
        targetType: 'TOAST',
        target: 'Hand-poured Concrete',
        sortOrder: 3,
      },
    ];

    for (const item of defaults) {
      const existing = await this.prisma.menuItem.findFirst({
        where: { section: item.section, label: item.label },
      });

      if (!existing) {
        await this.prisma.menuItem.create({ data: item });
      }
    }
  }

  private async ensureStaticPages() {
    const defaults = [
      {
        slug: 'help-support',
        title: 'Trợ giúp & Hỗ trợ',
        excerpt: 'Thông tin hỗ trợ khách hàng ShopQuiet.',
        content:
          'Chào mừng bạn đến với tổng đài hỗ trợ của ShopQuiet.\n\nNếu bạn gặp bất kỳ vấn đề gì về đơn hàng hoặc thanh toán ZaloPay, vui lòng liên hệ với chúng tôi qua hotline hoặc email bên dưới.',
        contactPhone: '1900 6000',
        contactEmail: 'support@shopquiet.vn',
      },
      {
        slug: 'about-shopquiet',
        title: 'About ShopQuiet',
        excerpt: 'Câu chuyện thương hiệu ShopQuiet.',
        content:
          'ShopQuiet là cửa hàng theo đuổi tinh thần tối giản, chất liệu tự nhiên và trải nghiệm mua sắm nhẹ nhàng cho cuộc sống hằng ngày.',
        contactPhone: '1900 6868',
        contactEmail: 'support@shopquiet.vn',
      },
    ];

    for (const item of defaults) {
      await this.prisma.staticPage.upsert({
        where: { slug: item.slug },
        update: {},
        create: item,
      });
    }
  }

  private async ensureShippingMethods() {
    const defaults = [
      {
        code: 'standard',
        name: 'Giao hàng tiêu chuẩn',
        description: 'Nhận hàng trong 3-5 ngày làm việc',
        price: 0,
        estimatedDays: '3-5 ngày',
        sortOrder: 1,
      },
      {
        code: 'express',
        name: 'Giao hàng hỏa tốc',
        description: 'Nhận hàng trong 1-2 ngày làm việc',
        price: 125000,
        estimatedDays: '1-2 ngày',
        sortOrder: 2,
      },
    ];

    for (const item of defaults) {
      await this.prisma.shippingMethod.upsert({
        where: { code: item.code },
        update: {
          name: item.name,
          description: item.description,
          price: item.price,
          estimatedDays: item.estimatedDays,
        },
        create: item,
      });
    }
  }

  private async ensurePaymentMethods() {
    const defaults = [
      {
        code: 'cod',
        name: 'Thanh toán khi nhận hàng (COD)',
        description: 'Thanh toán bằng tiền mặt khi giao hàng',
        provider: 'COD',
        badge: '',
        sortOrder: 1,
      },
      {
        code: 'zalopay',
        name: 'Cổng Sandbox ZaloPay',
        description: 'Thanh toán nhanh bằng ví hoặc quét mã QR',
        provider: 'ZALOPAY',
        badge: 'Ví ZaloPay',
        sortOrder: 2,
      },
      {
        code: 'bank',
        name: 'Chuyển khoản Ngân hàng (QR)',
        description: 'Quét mã QR để chuyển khoản nhanh 24/7',
        provider: 'BANK',
        badge: 'Chuyển Khoản',
        sortOrder: 3,
      },
    ];

    for (const item of defaults) {
      await this.prisma.paymentMethod.upsert({
        where: { code: item.code },
        update: {},
        create: item,
      });
    }
  }
}
