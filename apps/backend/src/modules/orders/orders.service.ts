import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

export interface CreateOrderItemDto {
  productId: number;
  quantity: number;
  price: number;
  size?: string;
}

export interface CreateOrderDto {
  totalAmount: number;
  items: CreateOrderItemDto[];
  status?: string;
  paymentMethod?: string;
  voucherCode?: string;
  discountAmount?: number;
  shippingAddress?: string;
  shippingPhone?: string;
  shippingName?: string;
  isDirectBuy?: boolean;
}

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private znsLogs: Array<{
    id: string;
    phone: string;
    name: string;
    content: string;
    time: string;
    status: string;
  }> = [
    {
      id: '1',
      phone: '0987654321',
      name: 'Alex Johnson',
      content: 'Đơn hàng #SQ-98243 của bạn đang được xử lý chuẩn bị.',
      time: '1 giờ trước',
      status: 'SUCCESS',
    },
    {
      id: '2',
      phone: '0912345678',
      name: 'Khánh Linh',
      content: 'Đơn hàng #SQ-82934 đã bàn giao cho shipper vận chuyển.',
      time: '2 giờ trước',
      status: 'SUCCESS',
    },
  ];

  getZnsLogs(): Array<{
    id: string;
    phone: string;
    name: string;
    content: string;
    time: string;
    status: string;
  }> {
    return this.znsLogs;
  }

  private async ensureUserExists(zaloId: string, name?: string) {
    const user = await this.prisma.user.findUnique({
      where: { zaloId },
    });
    if (!user) {
      await this.prisma.user.create({
        data: {
          zaloId,
          name: name || 'Khách hàng Zalo',
        },
      });
    }
  }

  async create(dto: CreateOrderDto, zaloUserId?: string) {
    // Generate a unique order ID matching SQ-XXXXX format
    let orderId = '';
    let isUnique = false;

    while (!isUnique) {
      const randomNum = Math.floor(10000 + Math.random() * 90000); // 5 digit random number
      orderId = `SQ-${randomNum}`;

      const existing = await this.prisma.order.findUnique({
        where: { id: orderId },
      });
      if (!existing) {
        isUnique = true;
      }
    }

    const filterUserId = zaloUserId || 'cust-zalo-id-1';

    // Ensure the user exists in database to avoid foreign key constraint errors
    await this.ensureUserExists(filterUserId, dto.shippingName || undefined);

    // We run the verification, stock decrement, and order creation inside a transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // 1. Verify stock and decrement for each item
      for (const item of dto.items) {
        const itemSize = item.size || 'DEFAULT';

        // Find variant
        const variant = await tx.productVariant.findUnique({
          where: {
            productId_size: {
              productId: item.productId,
              size: itemSize,
            },
          },
          include: {
            product: true,
          },
        });

        if (!variant) {
          throw new BadRequestException(
            `Không tìm thấy size ${itemSize} cho sản phẩm ID ${item.productId}`,
          );
        }

        if (variant.stock < item.quantity) {
          throw new BadRequestException(
            `Sản phẩm ${variant.product.name} (Size: ${itemSize}) chỉ còn ${variant.stock} sản phẩm trong kho.`,
          );
        }

        // Decrement stock
        await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            stock: variant.stock - item.quantity,
          },
        });
      }

      // 1.5. If voucher code is used, decrement its stock
      if (dto.voucherCode) {
        try {
          const voucher = await tx.voucher.findUnique({
            where: { code: dto.voucherCode.trim().toUpperCase() },
          });
          if (voucher && voucher.stock > 0) {
            await tx.voucher.update({
              where: { code: voucher.code },
              data: { stock: { decrement: 1 } },
            });
          }
        } catch {
          console.warn('Could not decrement voucher stock in transaction:');
        }
      }

      // 2. Create the order and items
      return tx.order.create({
        data: {
          id: orderId,
          totalAmount: dto.totalAmount,
          status: dto.status || 'PROCESSING',
          zaloUserId: filterUserId,
          paymentMethod: dto.paymentMethod || 'COD',
          voucherCode: dto.voucherCode || null,
          discountAmount: dto.discountAmount || 0,
          shippingAddress: dto.shippingAddress || null,
          shippingPhone: dto.shippingPhone || null,
          shippingName: dto.shippingName || null,
          items: {
            create: dto.items.map((item) => ({
              quantity: item.quantity,
              price: item.price,
              productId: item.productId,
              size: item.size || 'DEFAULT',
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    // Create custom dynamic notification for the user
    try {
      // Ensure user exists before creating notification (FK constraint)
      await this.ensureUserExists(filterUserId, dto.shippingName || undefined);

      const itemsText = order.items
        .map(
          (i) =>
            `${i.product.name}${i.size && i.size !== 'DEFAULT' ? ` (Size: ${i.size})` : ''} x${i.quantity}`,
        )
        .join(', ');

      const pmName =
        order.paymentMethod === 'ZALOPAY'
          ? 'cổng thanh toán ZaloPay'
          : 'COD (Thanh toán khi nhận hàng)';
      const shippingInfo = order.shippingAddress
        ? ` được giao tới địa chỉ ${order.shippingAddress}`
        : '';

      await this.prisma.notification.create({
        data: {
          zaloUserId: filterUserId,
          type: 'order',
          title: `Đơn hàng #${order.id} đặt thành công`,
          content: `Cảm ơn bạn! Đơn hàng gồm [${itemsText}] đã được xác nhận bằng phương thức ${pmName}${shippingInfo}.`,
          date:
            new Date().toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            }) +
            ' - ' +
            new Date().toLocaleDateString('vi-VN'),
          read: false,
        },
      });
    } catch (e: any) {
      console.error('Error creating post-order notification:', e?.message || e);
    }

    // Simulate ZNS dispatch
    this.znsLogs.unshift({
      id: Math.random().toString(36).substring(7),
      phone: order.shippingPhone || '0987654321',
      name: order.shippingName || 'Alex Johnson',
      content: `Đơn hàng mới #${order.id} trị giá $${order.totalAmount.toFixed(2)} đã được tiếp nhận thành công!`,
      time: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: 'SUCCESS',
    });

    return order;
  }

  async findAll(zaloUserId?: string) {
    const filterUserId = zaloUserId || 'cust-zalo-id-1';
    return this.prisma.order.findMany({
      where: {
        zaloUserId: filterUserId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findAllAdmin() {
    return this.prisma.order.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findOne(id: string, zaloUserId?: string) {
    const filterUserId = zaloUserId || 'cust-zalo-id-1';
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        zaloUserId: filterUserId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${id}`);
    }
    return order;
  }

  async updateStatus(id: string, status: string, trackingNumber?: string) {
    const order = await this.prisma.order.update({
      where: { id },
      data: { 
        status,
        ...(trackingNumber !== undefined ? { trackingNumber } : {}),
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Simulate ZNS dispatch
    let content = `Đơn hàng #${id} đã được cập nhật trạng thái mới.`;
    let notifTitle = `Đơn hàng #${id} cập nhật trạng thái`;

    if (status === 'PROCESSING') {
      content = `Cửa hàng đang chuẩn bị sản phẩm cho đơn hàng #${id} của bạn.`;
      notifTitle = `Đơn hàng #${id} đang được xử lý`;
    } else if (status === 'SHIPPED') {
      const trackingInfo = trackingNumber || (order as any).trackingNumber;
      content = `Đơn hàng #${id} đã bàn giao cho đơn vị vận chuyển.${trackingInfo ? ` Mã vận đơn của bạn: ${trackingInfo}` : ''}`;
      notifTitle = `Đơn hàng #${id} đang được giao`;
    } else if (status === 'DELIVERED') {
      content = `Đơn hàng #${id} đã giao thành công! Cảm ơn bạn đã tin dùng ShopQuiet.`;
      notifTitle = `Đơn hàng #${id} giao thành công`;
    } else if (status === 'CANCELLED') {
      content = `Đơn hàng #${id} đã được hủy bỏ thành công.`;
      notifTitle = `Đơn hàng #${id} đã hủy`;

      // Return stock back to inventory
      for (const item of order.items) {
        const itemSize = item.size || 'DEFAULT';
        try {
          await this.prisma.productVariant.update({
            where: {
              productId_size: {
                productId: item.productId,
                size: itemSize,
              },
            },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        } catch (e) {
          console.error(
            `Failed to restock variant for product ${item.productId} size ${itemSize}:`,
            e,
          );
        }
      }
    } else if (status === 'PENDING_PAYMENT') {
      content = `Đơn hàng #${id} đang chờ hoàn tất thanh toán qua cổng ZaloPay.`;
      notifTitle = `Đơn hàng #${id} chờ thanh toán`;
    }

    if (order.zaloUserId) {
      try {
        await this.prisma.notification.create({
          data: {
            zaloUserId: order.zaloUserId,
            type: 'order',
            title: notifTitle,
            content,
            date:
              new Date().toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              }) +
              ' - ' +
              new Date().toLocaleDateString('vi-VN'),
            read: false,
          },
        });
      } catch {
        console.error('Error creating status update notification');
      }
    }

    // Simulate ZNS dispatch
    this.znsLogs.unshift({
      id: Math.random().toString(36).substring(7),
      phone: order.shippingPhone || '0987654321',
      name: order.shippingName || 'Alex Johnson',
      content: `Đơn hàng mới #${order.id} trị giá $${order.totalAmount.toFixed(2)} đã được tiếp nhận thành công!`,
      time: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: 'SUCCESS',
    });

    return order;
  }

  async createZaloPayCheckout(dto: CreateOrderDto, zaloUserId?: string) {
    // 1. Create order in local database with PENDING_PAYMENT status
    const order = await this.create(
      {
        ...dto,
        status: 'PENDING_PAYMENT',
      },
      zaloUserId,
    );

    // 2. Prepare parameters for ZaloPay Checkout SDK
    const amountVnd = Math.round(order.totalAmount); // Already in VND
    const desc = `Thanh toan don hang #SQ-${order.id}`;

    // Item must contain only id and amount as expected by Zalo Checkout SDK
    const itemData = dto.items.map((item) => ({
      id: item.productId.toString(),
      amount: Math.round(item.price) * item.quantity,
    }));
    const item = JSON.stringify(itemData);

    // Extradata contains order id, user id, etc.
    const extradata = JSON.stringify({
      orderId: order.id,
      zaloUserId: zaloUserId || '',
    });

    // Method config: ZALOPAY_SANDBOX or BANK_SANDBOX for sandbox
    const reqMethod = (dto.paymentMethod || '').toUpperCase();
    let methodId = process.env.ZALO_PAYMENT_METHOD_ID || 'ZALOPAY_SANDBOX';
    if (reqMethod === 'BANK') {
      methodId = 'BANK_SANDBOX';
    }
    const method = JSON.stringify({
      id: methodId,
      isCustom: false,
    });

    // Sort parameters alphabetically of key names: amount, desc, extradata, item, method
    const sortedString = `amount=${amountVnd}&desc=${desc}&extradata=${extradata}&item=${item}&method=${method}`;

    // Use the Checkout SDK Private Key from .env for signing MAC
    const key1 =
      process.env.ZALO_PAYMENT_PRIVATE_KEY ||
      'sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn';
    const mac = crypto
      .createHmac('sha256', key1)
      .update(sortedString)
      .digest('hex');

    // Return the response for frontend createOrder SDK
    return {
      orderId: order.id,
      amount: amountVnd,
      desc,
      item,
      extradata,
      method,
      mac,
    };
  }

  async getZaloPayMacForExistingOrder(
    orderId: string,
    paymentMethod?: string,
    zaloUserId?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    if (order.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException(
        'Đơn hàng này không ở trạng thái chờ thanh toán',
      );
    }

    // 2. Prepare parameters for ZaloPay Checkout SDK
    const amountVnd = Math.round(order.totalAmount); // Already in VND
    const desc = `Thanh toan don hang #SQ-${order.id}`;

    // Item must contain only id and amount as expected by Zalo Checkout SDK
    const itemData = order.items.map((item) => ({
      id: item.productId.toString(),
      amount: Math.round(item.price) * item.quantity,
    }));
    const item = JSON.stringify(itemData);

    // Extradata contains order id, user id, etc.
    const extradata = JSON.stringify({
      orderId: order.id,
      zaloUserId: zaloUserId || '',
    });

    // Method config: ZALOPAY_SANDBOX or BANK_SANDBOX for sandbox
    const reqMethod = [paymentMethod, order.paymentMethod, '']
      .filter(Boolean)
      .join('')
      .toUpperCase();
    let methodId = process.env.ZALO_PAYMENT_METHOD_ID || 'ZALOPAY_SANDBOX';
    if (reqMethod === 'BANK') {
      methodId = 'BANK_SANDBOX';
    }
    const method = JSON.stringify({
      id: methodId,
      isCustom: false,
    });

    // Sort parameters alphabetically of key names: amount, desc, extradata, item, method
    const sortedString = `amount=${amountVnd}&desc=${desc}&extradata=${extradata}&item=${item}&method=${method}`;

    // Use the Checkout SDK Private Key from .env for signing MAC
    const key1 =
      process.env.ZALO_PAYMENT_PRIVATE_KEY ||
      'sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn';
    const mac = crypto
      .createHmac('sha256', key1)
      .update(sortedString)
      .digest('hex');

    return {
      orderId: order.id,
      amount: amountVnd,
      desc,
      item,
      extradata,
      method,
      mac,
    };
  }

  async handleZaloPayCallback(body: unknown) {
    const key2 = 'trMrHtvjo6myautxDUiAcYsVtaeQ8nhf';
    if (!body || typeof body !== 'object' || body === null) {
      return { return_code: -1, return_message: 'Missing data or mac' };
    }

    const callbackBody = body as { data?: unknown; mac?: unknown };
    const data = callbackBody.data;
    const mac = callbackBody.mac;

    if (typeof data !== 'string' || typeof mac !== 'string') {
      return { return_code: -1, return_message: 'Missing data or mac' };
    }

    // Verify MAC using Key 2
    const calculatedMac = crypto
      .createHmac('sha256', key2)
      .update(data)
      .digest('hex');

    if (calculatedMac !== mac) {
      console.warn('[ZaloPay Callback] MAC mismatch!');
      return { return_code: -1, return_message: 'mac mismatch' };
    }

    try {
      const parsedData = JSON.parse(data) as { embed_data?: unknown };
      // parsedData contains embed_data which we passed as extradata
      const embedDataRaw =
        typeof parsedData.embed_data === 'string'
          ? parsedData.embed_data
          : '{}';
      const embedData = JSON.parse(embedDataRaw) as { orderId?: unknown };
      const orderId =
        typeof embedData.orderId === 'string' ? embedData.orderId : undefined;

      if (!orderId) {
        console.warn('[ZaloPay Callback] No orderId found in embed_data');
        return { return_code: -1, return_message: 'orderId not found' };
      }

      // Update order status in Database to "PROCESSING" (Đã thanh toán)
      await this.updateStatus(orderId, 'PROCESSING');
      console.log(
        `[ZaloPay Callback] Order ${orderId} updated to PROCESSING successfully.`,
      );
      return { return_code: 1, return_message: 'success' };
    } catch (e) {
      console.error('[ZaloPay Callback] Error parsing callback data:', e);
      return { return_code: 0, return_message: 'error parsing callback data' };
    }
  }
}
