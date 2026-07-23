import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AiOpsAlert {
  id: string;
  type: 'LOW_STOCK' | 'STALE_ORDER' | 'RETURN_REQUEST' | 'DEMAND_SURGE' | 'VIP_MILESTONE';
  title: string;
  message: string;
  time: string;
  severity: 'high' | 'medium' | 'info';
  actionType: 'RESTOCK_ITEM' | 'VIEW_ORDERS' | 'VIEW_RETURNS' | 'FLASH_SALE' | 'GIFT_VIP_VOUCHER';
  actionPayload: any;
  isRead: boolean;
  isResolved?: boolean;
}

@Injectable()
export class GeminiAiOpsService {
  private readonly logger = new Logger(GeminiAiOpsService.name);
  private readAlertIds: Set<string> = new Set();
  private resolvedAlertIds: Set<string> = new Set();

  constructor(private prisma: PrismaService) {}

  private getGeminiApiKey(): string | undefined {
    return process.env.GEMINI_API_KEY;
  }

  // Call Google Gemini API to generate smart business insights
  async askGemini(prompt: string, contextData?: any): Promise<string> {
    const apiKey = this.getGeminiApiKey();

    if (apiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Bạn là Trợ Lý Quản Trị Vận Hành Doanh Nghiệp Gemini AI cho thương hiệu ShopQuiet E-Commerce.\nContext dữ liệu cửa hàng: ${JSON.stringify(contextData || {})}\n\nYêu cầu Admin: ${prompt}\n\nHãy trả lời bằng tiếng Việt ngắn gọn, chuyên nghiệp, hỗ trợ ra quyết định quản trị tốt nhất.`,
                    },
                  ],
                },
              ],
            }),
          },
        );

        if (response.ok) {
          const json = await response.json();
          const reply = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) return reply;
        }
      } catch (err: any) {
        this.logger.warn(`Gemini API call failed, falling back to local heuristic: ${err?.message}`);
      }
    }

    // Fallback Heuristic Intelligence Engine
    const lower = prompt.toLowerCase();
    if (lower.includes('kho') || lower.includes('tồn')) {
      const lowStockCount = await this.prisma.productVariant.count({ where: { stock: { lt: 5 } } });
      return `📊 BÁO CÁO KHO HÀNG (Gemini AI):\nHiện có ${lowStockCount} phân loại sản phẩm trong kho có tồn kho nguy cấp (< 5 sản phẩm). Bạn nên kiểm tra mục Kho hàng và bấm Nhập hàng ngẫu nhiên để tránh đứt hàng.`;
    }
    if (lower.includes('đơn') || lower.includes('doanh thu')) {
      const totalOrders = await this.prisma.order.count();
      const completedOrders = await this.prisma.order.findMany({ where: { status: { in: ['COMPLETED', 'DELIVERED'] } } });
      const rev = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      return `📈 THỐNG KÊ KINH DOANH (Gemini AI):\nTổng số đơn hàng ghi nhận: ${totalOrders} đơn. Tổng doanh thu tích lũy từ các đơn hoàn thành: ${rev.toLocaleString('vi-VN')} VNĐ.`;
    }

    return `🤖 Trợ lý Gemini AI đã ghi nhận yêu cầu của bạn! Hệ thống vẫn đang hoạt động trơn tru. Bạn có thể kiểm tra các thẻ cảnh báo vận hành 1-click bên trên để xử lý nhanh tồn kho và đơn hàng.`;
  }

  // Scan Prisma Database for live operational alerts
  async getLiveOperationalAlerts(): Promise<{ alerts: AiOpsAlert[]; unreadCount: number }> {
    const alerts: AiOpsAlert[] = [];

    try {
      // 1. Scan Low Stock Variants (< 5)
      const lowStockVariants = await this.prisma.productVariant.findMany({
        where: { stock: { lt: 5 } },
        include: { product: true },
        take: 3,
      });

      for (const variant of lowStockVariants) {
        const alertId = `stock-alert-${variant.id}`;
        const isResolved = this.resolvedAlertIds.has(alertId);
        const isRead = this.readAlertIds.has(alertId) || isResolved;

        alerts.push({
          id: alertId,
          type: 'LOW_STOCK',
          title: '⚠️ Cảnh báo Tồn kho Nguy cấp',
          message: `Sản phẩm '${variant.product.name}' (Màu: ${variant.color}, Size: ${variant.size}) chỉ còn ${variant.stock} sản phẩm trong kho. Gemini AI khuyên bạn nên nhập thêm 25 sản phẩm!`,
          time: 'Vừa xong',
          severity: 'high',
          actionType: 'RESTOCK_ITEM',
          actionPayload: { variantId: variant.id, productName: variant.product.name, restockAmount: 25 },
          isRead,
          isResolved,
        });
      }

      // 2. Scan Return Requests
      const returnOrders = await this.prisma.order.findMany({
        where: { status: 'RETURN_REQUESTED' },
        take: 2,
      });

      for (const order of returnOrders) {
        const alertId = `return-alert-${order.id}`;
        const isResolved = this.resolvedAlertIds.has(alertId);
        const isRead = this.readAlertIds.has(alertId) || isResolved;

        alerts.push({
          id: alertId,
          type: 'RETURN_REQUEST',
          title: '🚨 Cảnh báo Khiếu nại Đổi trả',
          message: `Khách hàng '${order.shippingName || 'Khách Zalo'}' vừa gửi yêu cầu Trả hàng / Hoàn tiền cho đơn #${order.id.slice(-6).toUpperCase()} với lý do: '${order.returnReason || 'Không hài lòng'}'.`,
          time: '10 phút trước',
          severity: 'high',
          actionType: 'VIEW_RETURNS',
          actionPayload: { orderId: order.id },
          isRead,
          isResolved,
        });
      }

      // 3. Scan Stale Processing Orders
      const processingOrders = await this.prisma.order.findMany({
        where: { status: 'PROCESSING' },
        take: 2,
      });

      if (processingOrders.length > 0) {
        const alertId = `stale-orders-alert`;
        const isResolved = this.resolvedAlertIds.has(alertId);
        const isRead = this.readAlertIds.has(alertId) || isResolved;

        alerts.push({
          id: alertId,
          type: 'STALE_ORDER',
          title: '⏳ Cảnh báo Đơn hàng Chờ duyệt',
          message: `Hiện có ${processingOrders.length} đơn hàng mới ở trạng thái 'Đang xử lý' chưa được bàn giao cho Shipper. Vui lòng duyệt sớm để tránh bị chậm chỉ tiêu giao hàng!`,
          time: '15 phút trước',
          severity: 'medium',
          actionType: 'VIEW_ORDERS',
          actionPayload: {},
          isRead,
          isResolved,
        });
      }

      // 4. VIP Milestone Customers (Gold & Diamond Tiers Only, Max 1 per week)
      const vipUsers = await this.prisma.user.findMany({
        where: {
          membershipTier: { in: ['Vàng', 'Kim Cương'] },
        },
        orderBy: { gamificationPoints: 'desc' },
        take: 3,
      });

      // Filter users who haven't received a VIP voucher in the last 7 days (1 week cooldown)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      for (const u of vipUsers) {
        const recentVipNotif = await this.prisma.notification.findFirst({
          where: {
            zaloUserId: u.zaloId,
            title: { contains: 'Voucher Tri Ân VIP' },
            createdAt: { gte: oneWeekAgo },
          },
        });

        // Skip if gifted within the last week
        if (recentVipNotif) continue;

        const alertId = `vip-alert-${u.zaloId}`;
        const isResolved = this.resolvedAlertIds.has(alertId);
        const isRead = this.readAlertIds.has(alertId) || isResolved;

        alerts.push({
          id: alertId,
          type: 'VIP_MILESTONE',
          title: `💎 Khách hàng VIP (${u.membershipTier}) Thân thiết`,
          message: `Tài khoản '${u.name || 'Khách Zalo'}' (SĐT: ${u.phone || '0336433234'}) đạt hạng Hạng ${u.membershipTier} với ${u.gamificationPoints || 100} điểm tích lũy. Gemini AI đề xuất tặng Voucher tri ân VIP (Tặng 1 lần/tuần)!`,
          time: 'Vừa xong',
          severity: 'info',
          actionType: 'GIFT_VIP_VOUCHER',
          actionPayload: { zaloUserId: u.zaloId, userName: u.name || 'Khách hàng VIP' },
          isRead,
          isResolved,
        });

        // Show max 1 active VIP recommendation alert
        break;
      }
    } catch (e) {
      this.logger.error('Error fetching AI ops alerts:', e);
    }

    // Exclude resolved alerts from unread count
    const unreadCount = alerts.filter((a) => !a.isRead && !a.isResolved).length;
    return { alerts, unreadCount };
  }

  // Mark all or specific alerts as read
  markAlertsAsRead(alertId?: string) {
    if (alertId) {
      this.readAlertIds.add(alertId);
    }
  }

  // Execute 1-Click Action from AI Chatbox & Mark Alert as Resolved
  async executeAction(actionType: string, payload: any, alertId?: string): Promise<{ success: boolean; message: string }> {
    try {
      if (alertId) {
        this.resolvedAlertIds.add(alertId);
        this.readAlertIds.add(alertId);
      }

      if (actionType === 'RESTOCK_ITEM') {
        const { variantId, restockAmount = 25 } = payload;
        if (variantId) {
          const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
          if (variant) {
            await this.prisma.productVariant.update({
              where: { id: variantId },
              data: { stock: variant.stock + restockAmount },
            });
            return {
              success: true,
              message: `Đã cộng thêm +${restockAmount} sản phẩm vào tồn kho thành công! Cảnh báo đã được giải quyết.`,
            };
          }
        }
      }

      if (actionType === 'GIFT_VIP_VOUCHER') {
        const { zaloUserId, userName } = payload;
        const code = `VIP-${zaloUserId ? zaloUserId.slice(-4) : 'GIFT'}-${Math.random().toString(36).substring(7).toUpperCase()}`;

        // 1. Create global voucher in DB
        await this.prisma.voucher.create({
          data: {
            code,
            type: 'FIXED',
            value: 30000,
            minOrderVal: 200000,
            stock: 1, // Exclusively 1 stock for this targeted customer!
            expiresAt: new Date('2026-12-31'),
          },
        });

        // 2. Dispatch targeted personal Notification to the specific Zalo User
        if (zaloUserId) {
          try {
            await this.prisma.notification.create({
              data: {
                zaloUserId: zaloUserId,
                type: 'voucher',
                title: '🎁 Bạn nhận được Voucher Tri Ân VIP!',
                content: `ShopQuiet dành riêng cho bạn ${userName || 'Khách hàng VIP'} Mã Voucher '${code}' giảm ngay 30.000đ cho đơn từ 200.000đ. Nhập mã khi thanh toán nhé!`,
                date: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('vi-VN'),
                read: false,
              },
            });
          } catch (e) {
            this.logger.error('Failed to create targeted notification:', e);
          }
        }

        return {
          success: true,
          message: `Đã tạo & gửi đích danh Voucher mã '${code}' tới khách hàng ${userName || 'VIP'}! Cảnh báo đã được giải quyết.`,
        };
      }

      return { success: true, message: 'Đã chuyển hướng và xử lý thành công!' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Không thể thực thi lệnh.' };
    }
  }
}
