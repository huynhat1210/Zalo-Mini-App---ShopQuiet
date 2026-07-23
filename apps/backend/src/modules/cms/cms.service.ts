import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
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
      console.error(
        `Failed to load Payload CMS content for ${normalizedType}:`,
        error,
      );
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
    const [
      settings,
      menuItems,
      staticPages,
      shippingMethods,
      paymentMethods,
      banners,
      featuredCategories,
      news,
      terms,
      policies,
      faq,
      notifications,
      advertisements,
      landingPages,
    ] = await Promise.all([
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
      {
        key: 'shop.status',
        label: 'Trạng thái hoạt động của Shop',
        value: 'ONLINE',
        group: 'support',
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

  private getModelKey(modelName: string): string {
    const prismaKeys = Object.keys(this.prisma).filter(
      (k) => !k.startsWith('_') && !k.startsWith('$'),
    );
    const matched = prismaKeys.find(
      (k) => k.toLowerCase() === modelName.toLowerCase(),
    );
    if (!matched) {
      throw new NotFoundException(`Model ${modelName} does not exist`);
    }
    return matched;
  }

  private getParsedId(id: string): string | number {
    const num = Number(id);
    if (!isNaN(num) && /^\d+$/.test(id)) {
      return num;
    }
    return id;
  }

  async getDatabaseSummary() {
    const keys = Object.keys(this.prisma).filter(
      (k) =>
        !k.startsWith('_') &&
        !k.startsWith('$') &&
        typeof (this.prisma as any)[k]?.count === 'function',
    );

    const summary = await Promise.all(
      keys.map(async (key) => {
        const count = await (this.prisma as any)[key].count();
        return {
          model: key.charAt(0).toUpperCase() + key.slice(1),
          count,
        };
      }),
    );
    return summary;
  }

  async getRecords(modelName: string) {
    const modelKey = this.getModelKey(modelName);

    const include: any = {};
    if (modelKey === 'order') {
      include.items = {
        include: {
          product: true,
        },
      };
    } else if (modelKey === 'product') {
      include.variants = true;
    }

    const queryOptions: any = {};
    if (Object.keys(include).length > 0) {
      queryOptions.include = include;
    }

    try {
      return await (this.prisma as any)[modelKey].findMany({
        ...queryOptions,
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      try {
        return await (this.prisma as any)[modelKey].findMany({
          ...queryOptions,
          orderBy: { id: 'desc' },
        });
      } catch {
        return await (this.prisma as any)[modelKey].findMany(queryOptions);
      }
    }
  }

  async createRecord(modelName: string, data: any) {
    const modelKey = this.getModelKey(modelName);
    const cleanData = { ...data };
    delete cleanData.id;
    delete cleanData.createdAt;
    delete cleanData.updatedAt;

    const record = await (this.prisma as any)[modelKey].create({
      data: cleanData,
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          adminId: 'admin-zalo-id-1',
          action: `Tạo ${modelName}`,
          details: `Đã tạo bản ghi mới trong bảng ${modelName} với dữ liệu: ${JSON.stringify(cleanData).substring(0, 500)}`,
        },
      });
    } catch (e) {
      console.error('AuditLog error:', e);
    }

    return record;
  }

  async updateRecord(modelName: string, id: string, data: any) {
    const modelKey = this.getModelKey(modelName);
    const parsedId = this.getParsedId(id);
    const cleanData = { ...data };
    delete cleanData.id;
    delete cleanData.createdAt;
    delete cleanData.updatedAt;

    const record = await (this.prisma as any)[modelKey].update({
      where: { id: parsedId },
      data: cleanData,
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          adminId: 'admin-zalo-id-1',
          action: `Sửa ${modelName}`,
          details: `Đã cập nhật bản ghi ID ${id} trong bảng ${modelName} với dữ liệu mới: ${JSON.stringify(cleanData).substring(0, 500)}`,
        },
      });
    } catch (e) {
      console.error('AuditLog error:', e);
    }

    return record;
  }

  async deleteRecord(modelName: string, id: string) {
    const modelKey = this.getModelKey(modelName);
    const parsedId = this.getParsedId(id);
    const record = await (this.prisma as any)[modelKey].delete({
      where: { id: parsedId },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          adminId: 'admin-zalo-id-1',
          action: `Xóa ${modelName}`,
          details: `Đã xóa bản ghi ID ${id} khỏi bảng ${modelName}`,
        },
      });
    } catch (e) {
      console.error('AuditLog error:', e);
    }

    return record;
  }

  async getAdminNotifications() {
    const adminNotifs: Array<{
      id: number | string;
      title: string;
      content: string;
      type: string;
      date: string;
      read: boolean;
      link?: string;
    }> = [];

    try {
      // 1. Fetch Return Request Orders (High Priority Admin Alert)
      const returnOrders = await this.prisma.order.findMany({
        where: { status: 'RETURN_REQUESTED' },
        take: 3,
        orderBy: { createdAt: 'desc' },
      });

      returnOrders.forEach((o) => {
        adminNotifs.push({
          id: `admin-return-${o.id}`,
          title: `🚨 Yêu cầu đổi trả đơn #${o.id.slice(-6).toUpperCase()}`,
          content: `Khách hàng '${o.shippingName || 'Khách Zalo'}' xin hoàn tiền với lý do: "${o.returnReason || 'Hàng không đúng'}"`,
          type: 'admin_return',
          date: new Date(o.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date(o.createdAt).toLocaleDateString('vi-VN'),
          read: false,
          link: '/orders',
        });
      });

      // 2. Fetch Processing New Orders (Admin Order Alert)
      const processingOrders = await this.prisma.order.findMany({
        where: { status: 'PROCESSING' },
        take: 4,
        orderBy: { createdAt: 'desc' },
      });

      processingOrders.forEach((o) => {
        adminNotifs.push({
          id: `admin-order-${o.id}`,
          title: `🛒 Đơn hàng mới #${o.id.slice(-6).toUpperCase()}`,
          content: `Khách hàng '${o.shippingName || 'Khách Zalo'}' vừa đặt đơn trị giá ${o.totalAmount.toLocaleString('vi-VN')} VNĐ qua ${o.paymentMethod || 'COD'}.`,
          type: 'admin_order',
          date: new Date(o.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date(o.createdAt).toLocaleDateString('vi-VN'),
          read: false,
          link: '/orders',
        });
      });

      // 3. Fetch Low Stock Items (< 5)
      const lowStockVariants = await this.prisma.productVariant.findMany({
        where: { stock: { lt: 5 } },
        include: { product: true },
        take: 3,
      });

      lowStockVariants.forEach((v) => {
        adminNotifs.push({
          id: `admin-stock-${v.id}`,
          title: `⚠️ Cảnh báo tồn kho nguy cấp`,
          content: `Sản phẩm '${v.product.name}' (Màu: ${v.color}, Size: ${v.size}) chỉ còn ${v.stock} sản phẩm trong kho.`,
          type: 'admin_stock',
          date: 'Hôm nay',
          read: false,
          link: '/inventory',
        });
      });

      // 4. Fetch DB admin system notifications (excluding customer vouchers & badges)
      const dbAdminNotifs = await this.prisma.notification.findMany({
        where: {
          zaloUserId: null,
          NOT: [
            { type: { in: ['voucher', 'badge', 'user'] } },
          ],
        },
        orderBy: { id: 'desc' },
        take: 5,
      });

      dbAdminNotifs.forEach((n) => {
        if (!adminNotifs.some((existing) => existing.title === n.title)) {
          adminNotifs.push({
            id: n.id,
            title: n.title,
            content: n.content,
            type: n.type || 'admin_system',
            date: n.date,
            read: n.read,
          });
        }
      });
    } catch (e) {
      console.error('Error fetching admin notifications:', e);
    }

    return adminNotifs;
  }

  async getDashboardAnalytics() {
    // 1. Calculate total sales (sum of COMPLETED and DELIVERED orders)
    const completedOrders = await this.prisma.order.findMany({
      where: {
        status: { in: ['COMPLETED', 'DELIVERED'] },
      },
      select: { totalAmount: true, createdAt: true },
    });

    const totalRevenue = completedOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );

    // 2. Count total orders by status
    const allOrders = await this.prisma.order.findMany({
      select: { status: true },
    });
    const orderStatusCounts = allOrders.reduce<Record<string, number>>(
      (acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      },
      {},
    );

    // 3. Count total users
    const totalUsers = await this.prisma.user.count();

    // 4. Low stock variants alert (stock < 10)
    const lowStockVariants = await this.prisma.productVariant.findMany({
      where: {
        stock: { lt: 10 },
      },
      include: {
        product: {
          select: { name: true },
        },
      },
      take: 10,
    });

    // 5. Best selling products (sorted by soldCount desc)
    const bestSellers = await this.prisma.product.findMany({
      orderBy: { soldCount: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        price: true,
        soldCount: true,
        images: true,
      },
    });

    // 6. Generate 30 days revenue chart data
    const dailyRevenue: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateString = date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      });
      dailyRevenue[dateString] = 0;
    }

    completedOrders.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      const dateString = orderDate.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      });
      if (dailyRevenue[dateString] !== undefined) {
        dailyRevenue[dateString] += order.totalAmount;
      }
    });

    const revenueChartData = Object.keys(dailyRevenue).map((date) => ({
      date,
      revenue: dailyRevenue[date],
    }));

    // 7. Get category products sold count
    const categories = await this.prisma.category.findMany({
      include: {
        products: {
          select: { soldCount: true },
        },
      },
    });
    const categoryChartData = categories
      .map((cat) => {
        const totalSold = cat.products.reduce(
          (sum, p) => sum + (p.soldCount || 0),
          0,
        );
        return {
          name: cat.name,
          value: totalSold,
        };
      })
      .filter((c) => c.value > 0);

    return {
      stats: {
        totalRevenue,
        totalOrders: allOrders.length,
        totalUsers,
        statusCounts: orderStatusCounts,
      },
      lowStockVariants,
      bestSellers,
      revenueChartData,
      categoryChartData,
    };
  }

  async getShopStatus() {
    const setting = await this.prisma.siteSetting.findUnique({
      where: { key: 'shop.status' },
    });
    return { status: setting?.value || 'ONLINE' };
  }

  async updateShopStatus(status: 'ONLINE' | 'OFFLINE') {
    await this.prisma.siteSetting.upsert({
      where: { key: 'shop.status' },
      update: { value: status },
      create: {
        key: 'shop.status',
        label: 'Trạng thái hoạt động của Shop',
        value: status,
        group: 'support',
      },
    });
    return { success: true, status };
  }
}
