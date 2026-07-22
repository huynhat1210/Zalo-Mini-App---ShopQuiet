import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import { calculateEstimatedDeliveryDate } from '../../utils/delivery-date.util';
import { OrderTrackingGateway } from '../websocket/websocket.gateway';

export interface CreateOrderItemDto {
  productId: number;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
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
  shippingMethodCode?: string;
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private orderTrackingGateway: OrderTrackingGateway,
  ) {}

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

  async updateUserMembership(zaloUserId: string) {
    if (!zaloUserId) return;
    
    // Sum totalAmount of all COMPLETED and DELIVERED orders
    const completedOrders = await this.prisma.order.findMany({
      where: {
        zaloUserId,
        status: { in: ['COMPLETED', 'DELIVERED'] }
      },
      select: { totalAmount: true }
    });

    const totalOrderSpend = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Calculate tier
    let membershipTier = 'Đồng';
    if (totalOrderSpend >= 50000000) {
      membershipTier = 'Kim cương';
    } else if (totalOrderSpend >= 10000000) {
      membershipTier = 'Vàng';
    } else if (totalOrderSpend >= 2000000) {
      membershipTier = 'Bạc';
    }

    // Update user
    await this.prisma.user.update({
      where: { zaloId: zaloUserId },
      data: {
        membershipTier
      }
    });
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

    // Tính toán bảo mật giá đơn hàng tại Backend dựa trên hạng thành viên và voucher
    const user = await this.prisma.user.findUnique({
      where: { zaloId: filterUserId }
    });
    const tier = user?.membershipTier || 'Đồng';

    const discountPercent = tier === 'Bạc' ? 5 : (tier === 'Vàng' ? 10 : (tier === 'Kim cương' ? 15 : 0));
    const freeShipThreshold = tier === 'Bạc' ? 150000 : (tier === 'Vàng' ? 100000 : (tier === 'Kim cương' ? 0 : 200000));

    let subtotal = 0;
    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
      if (product) {
        subtotal += product.price * item.quantity;
      }
    }

    let shippingCost = dto.shippingMethodCode === 'express' ? 50000 : 30000;
    if (subtotal >= freeShipThreshold) {
      shippingCost = 0;
    }

    const tierDiscount = Math.round(subtotal * (discountPercent / 100));
    let voucherDiscount = 0;

    if (dto.voucherCode) {
      const voucher = await this.prisma.voucher.findUnique({
        where: { code: dto.voucherCode.trim().toUpperCase() }
      });
      if (voucher) {
        if (voucher.type.toUpperCase() === 'PERCENT') {
          voucherDiscount = Math.round(subtotal * (voucher.value / 100));
          if (voucher.maxDiscount) {
            voucherDiscount = Math.min(voucherDiscount, voucher.maxDiscount);
          }
        } else if (voucher.type.toUpperCase() === 'FIXED') {
          voucherDiscount = voucher.value;
        } else if (voucher.type.toUpperCase() === 'FREESHIP') {
          voucherDiscount = shippingCost;
        }
      }
    }

    const finalDiscount = tierDiscount + voucherDiscount;
    const finalTotalAmount = Math.max(0, subtotal + shippingCost - finalDiscount);

    // We run the verification, stock decrement, and order creation inside a transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // 1. Verify stock and decrement for each item
      for (const item of dto.items) {
        const itemSize = item.size || 'DEFAULT';
        const itemColor = item.color || 'DEFAULT';

        // Find variant
        const variant = await tx.productVariant.findUnique({
          where: {
            productId_color_size: {
              productId: item.productId,
              color: itemColor,
              size: itemSize,
            },
          },
          include: {
            product: true,
          },
        });

        if (!variant) {
          throw new BadRequestException(
            `Không tìm thấy phân loại ${itemColor} - ${itemSize} cho sản phẩm ID ${item.productId}`,
          );
        }

        if (variant.stock < item.quantity) {
          throw new BadRequestException(
            `Sản phẩm ${variant.product.name} (Phân loại: ${itemColor} - ${itemSize}) chỉ còn ${variant.stock} sản phẩm trong kho.`,
          );
        }

        // Decrement stock
        await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            stock: variant.stock - item.quantity,
          },
        });

        // Increment product soldCount
        await tx.product.update({
          where: { id: item.productId },
          data: {
            soldCount: { increment: item.quantity }
          }
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

      // 2. Calculate estimated delivery date
      const shippingMethodCode = dto.shippingMethodCode || 'standard';
      const deliveryDateRange = calculateEstimatedDeliveryDate(new Date(), shippingMethodCode);

      // 3. Create the order and items
      return tx.order.create({
        data: {
          id: orderId,
          totalAmount: finalTotalAmount,
          status: dto.status || 'PROCESSING',
          zaloUserId: filterUserId,
          paymentMethod: dto.paymentMethod || 'COD',
          voucherCode: dto.voucherCode || null,
          discountAmount: finalDiscount,
          shippingAddress: dto.shippingAddress || null,
          shippingPhone: dto.shippingPhone || null,
          shippingName: dto.shippingName || null,
          estimatedDeliveryDate: deliveryDateRange.minDate,
          shippingMethodCode: shippingMethodCode,
          items: {
            create: dto.items.map((item) => ({
              quantity: item.quantity,
              price: item.price,
              productId: item.productId,
              size: item.size || 'DEFAULT',
              color: item.color || 'DEFAULT',
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
            `${i.product.name}${i.color && i.color !== 'DEFAULT' ? ` (Màu: ${i.color})` : ''}${i.size && i.size !== 'DEFAULT' ? ` (Size: ${i.size})` : ''} x${i.quantity}`,
        )
        .join(', ');

      const pmName =
        order.paymentMethod === 'ZALOPAY'
          ? 'cổng thanh toán ZaloPay'
          : 'COD (Thanh toán khi nhận hàng)';
      const shippingInfo = order.shippingAddress
        ? ` được giao tới địa chỉ ${order.shippingAddress}`
        : '';

      const isUnpaid = order.status === 'PENDING_PAYMENT';
      const notifTitle = isUnpaid
        ? `Đơn hàng #${order.id} chưa thanh toán`
        : `Đơn hàng #${order.id} đặt thành công`;

      const notifContent = isUnpaid
        ? `Đơn hàng gồm [${itemsText}] đã được khởi tạo bằng phương thức ${pmName}. Vui lòng hoàn tất thanh toán.`
        : `Cảm ơn bạn! Đơn hàng gồm [${itemsText}] đã được xác nhận bằng phương thức ${pmName}${shippingInfo}.`;

      await this.prisma.notification.create({
        data: {
          zaloUserId: filterUserId,
          type: 'order',
          title: notifTitle,
          content: notifContent,
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

    if (order.zaloUserId) {
      await this.updateUserMembership(order.zaloUserId);

      // Tích điểm thưởng mua sắm: 1 điểm cho mỗi 1.000đ
      const earnedPoints = Math.round(order.totalAmount / 1000);
      if (earnedPoints > 0) {
        try {
          const user = await this.prisma.user.findUnique({ where: { zaloId: order.zaloUserId } });
          if (user) {
            const newPoints = (user.gamificationPoints || 0) + earnedPoints;
            await this.prisma.user.update({
              where: { zaloId: order.zaloUserId },
              data: { gamificationPoints: newPoints }
            });

            await this.prisma.pointsHistory.create({
              data: {
                zaloUserId: order.zaloUserId,
                points: earnedPoints,
                reason: `Tích điểm mua sắm đơn hàng #${order.id}`,
                metadata: { orderId: order.id }
              }
            });

            await this.prisma.notification.create({
              data: {
                zaloUserId: order.zaloUserId,
                type: 'order',
                title: `🎉 Tích điểm thành công`,
                content: `Bạn được cộng +${earnedPoints} điểm tích lũy từ đơn hàng #${order.id}.`,
                date: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('vi-VN'),
                read: false,
              }
            });
          }
        } catch (e) {
          console.error('Failed to reward points for order creation:', e);
        }
      }
    }

    return order;
  }

  async findAll(zaloUserId?: string) {
    const filterUserId = zaloUserId || 'cust-zalo-id-1';
    const [orders, reviews] = await Promise.all([
      this.prisma.order.findMany({
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
      }),
      this.prisma.comment.findMany({
        where: { zaloUserId: filterUserId }
      })
    ]);

    return orders.map(order => ({
      ...order,
      items: order.items.map(item => ({
        ...item,
        isReviewed: reviews.some(r => r.orderId === order.id && r.productId === item.productId)
      }))
    }));
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
    const [order, reviews] = await Promise.all([
      this.prisma.order.findFirst({
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
      }),
      this.prisma.comment.findMany({
        where: { zaloUserId: filterUserId }
      })
    ]);

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${id}`);
    }

    return {
      ...order,
      items: order.items.map(item => ({
        ...item,
        isReviewed: reviews.some(r => r.orderId === order.id && r.productId === item.productId)
      }))
    };
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

    const itemsText = order.items
      .map(
        (i) =>
          `${i.product.name}${i.color && i.color !== 'DEFAULT' ? ` (Màu: ${i.color})` : ''}${i.size && i.size !== 'DEFAULT' ? ` (Size: ${i.size})` : ''} x${i.quantity}`,
      )
      .join(', ');

    // Simulate ZNS dispatch
    let content = `Đơn hàng #${id} gồm [${itemsText}] đã được cập nhật trạng thái mới.`;
    let notifTitle = `Đơn hàng #${id} cập nhật trạng thái`;

    if (status === 'PROCESSING') {
      content = `Cửa hàng đang chuẩn bị sản phẩm cho đơn hàng #${id} của bạn gồm [${itemsText}].`;
      notifTitle = `Đơn hàng #${id} đang được xử lý`;
    } else if (status === 'SHIPPED') {
      const trackingInfo = trackingNumber || (order as any).trackingNumber;
      content = `Đơn hàng #${id} gồm [${itemsText}] đã bàn giao cho đơn vị vận chuyển.${trackingInfo ? ` Mã vận đơn của bạn: ${trackingInfo}` : ''}`;
      notifTitle = `Đơn hàng #${id} đang được giao`;
    } else if (status === 'DELIVERED' || status === 'COMPLETED') {
      content = `Đơn hàng #${id} gồm [${itemsText}] đã giao thành công! Cảm ơn bạn đã tin dùng ShopQuiet.`;
      notifTitle = `Đơn hàng #${id} giao thành công`;
    } else if (status === 'CANCELLED' || status === 'RETURNED') {
      const isReturn = status === 'RETURNED';
      content = isReturn
        ? `Đơn hàng #${id} gồm [${itemsText}] đã được hoàn trả thành công.`
        : `Đơn hàng #${id} gồm [${itemsText}] đã được hủy bỏ thành công.`;
      notifTitle = isReturn
        ? `Đơn hàng #${id} đã hoàn trả`
        : `Đơn hàng #${id} đã hủy`;

      // Return stock back to inventory and decrement soldCount
      for (const item of order.items) {
        const itemSize = item.size || 'DEFAULT';
        const itemColor = item.color || 'DEFAULT';
        try {
          await this.prisma.productVariant.update({
            where: {
              productId_color_size: {
                productId: item.productId,
                color: itemColor,
                size: itemSize,
              },
            },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });

          // Decrement product soldCount
          await this.prisma.product.update({
            where: { id: item.productId },
            data: {
              soldCount: {
                decrement: item.quantity,
              },
            },
          });
        } catch (e) {
          console.error(
            `Failed to restock or decrement soldCount for product ${item.productId} size ${itemSize}:`,
            e,
          );
        }
      }
    } else if (status === 'PENDING_PAYMENT') {
      content = `Đơn hàng #${id} đang chờ hoàn tất thanh toán qua cổng ZaloPay.`;
      notifTitle = `Đơn hàng #${id} chờ thanh toán`;
    }

    // Broadcast order status update via WebSocket
    this.orderTrackingGateway.broadcastOrderStatus(id, status);

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

    if (order.zaloUserId) {
      await this.updateUserMembership(order.zaloUserId);
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          adminId: 'admin-zalo-id-1',
          action: 'Cập nhật đơn hàng',
          details: `Đã cập nhật trạng thái đơn hàng #${order.id} thành ${status}`
        }
      });
    } catch (e) {
      console.error('AuditLog error in order status update:', e);
    }

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

  async requestReturn(id: string, reason: string, description: string, images?: string[]) {
    const order = await this.prisma.order.update({
      where: { id },
      data: {
        status: 'RETURN_REQUESTED',
        returnReason: reason,
        returnDescription: description,
        returnImages: images ? JSON.stringify(images) : null,
      },
    });

    try {
      if (order.zaloUserId) {
        await this.prisma.notification.create({
          data: {
            zaloUserId: order.zaloUserId,
            title: `Yêu cầu trả hàng #${id}`,
            content: `Yêu cầu trả hàng của đơn hàng #${id} đã gửi thành công. Cửa hàng sẽ xét duyệt sớm nhất.`,
            type: 'order',
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
      }
    } catch (e) {
      console.error('Failed to create notification for return:', e);
    }

    return order;
  }
}
