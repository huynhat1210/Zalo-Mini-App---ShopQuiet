import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderTrackingGateway } from '../websocket/websocket.gateway';
import { OrderStatus } from '@prisma/client';

export interface BankConfig {
  bankId: string; // e.g. 'MB', 'VCB', 'TCB', 'ACB', 'VTB'
  accountNo: string;
  accountName: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private orderTrackingGateway: OrderTrackingGateway,
  ) {}

  async getBankConfig(): Promise<BankConfig> {
    try {
      const setting = await this.prisma.siteSetting.findUnique({
        where: { key: 'bank_config' },
      });
      if (setting?.value) {
        const parsed = JSON.parse(setting.value);
        return {
          bankId: parsed.bankId || 'MB',
          accountNo: parsed.accountNo || '0988776655',
          accountName: parsed.accountName || 'SHOPQUIET STORE',
        };
      }
    } catch (e) {
      this.logger.error('Failed to parse bank_config setting:', e);
    }
    return {
      bankId: 'MB',
      accountNo: '0988776655',
      accountName: 'SHOPQUIET STORE',
    };
  }

  async updateBankConfig(config: BankConfig): Promise<BankConfig> {
    await this.prisma.siteSetting.upsert({
      where: { key: 'bank_config' },
      update: {
        value: JSON.stringify(config),
        active: true,
      },
      create: {
        key: 'bank_config',
        label: 'Cấu hình Ngân hàng VietQR',
        value: JSON.stringify(config),
        active: true,
        group: 'payment',
      },
    });
    return config;
  }

  async generateVietQR(orderId: string, amount: number) {
    const config = await this.getBankConfig();
    const shortCode = typeof orderId === 'string' ? orderId.slice(-6).toUpperCase() : String(orderId);
    const transferContent = `DH${shortCode}`;
    const roundedAmount = Math.round(amount);

    // VietQR QuickLink Open Standard
    const qrUrl = `https://img.vietqr.io/image/${config.bankId}-${config.accountNo}-compact2.png?amount=${roundedAmount}&addInfo=${encodeURIComponent(
      transferContent,
    )}&accountName=${encodeURIComponent(config.accountName)}`;

    // VietQR Universal DeepLinks for 1-Touch App Launching
    const deepLinks = {
      vcb: `https://dl.vietqr.io/pay?app=vcb&ba=${config.accountNo}@${config.bankId}&am=${roundedAmount}&des=${encodeURIComponent(transferContent)}`,
      mb: `https://dl.vietqr.io/pay?app=mb&ba=${config.accountNo}@${config.bankId}&am=${roundedAmount}&des=${encodeURIComponent(transferContent)}`,
      tcb: `https://dl.vietqr.io/pay?app=tcb&ba=${config.accountNo}@${config.bankId}&am=${roundedAmount}&des=${encodeURIComponent(transferContent)}`,
      acb: `https://dl.vietqr.io/pay?app=acb&ba=${config.accountNo}@${config.bankId}&am=${roundedAmount}&des=${encodeURIComponent(transferContent)}`,
      universal: `https://dl.vietqr.io/pay?ba=${config.accountNo}@${config.bankId}&am=${roundedAmount}&des=${encodeURIComponent(transferContent)}`,
    };

    return {
      success: true,
      qrUrl,
      bankId: config.bankId,
      accountNo: config.accountNo,
      accountName: config.accountName,
      amount: roundedAmount,
      transferContent,
      orderId,
      deepLinks,
    };
  }

  async handleWebhook(payload: any) {
    this.logger.log(`Received Bank Webhook: ${JSON.stringify(payload)}`);

    // Standard SePAY / PayOS / Cassette fields
    const content = payload.content || payload.description || payload.addInfo || payload.code || '';
    const amount = payload.transferAmount || payload.amount || 0;

    if (!content) {
      return { success: false, message: 'Missing transaction content' };
    }

    // Find all pending orders
    const pendingOrders = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.PENDING, OrderStatus.PENDING_PAYMENT, OrderStatus.PROCESSING] },
      },
    });

    // Match order by short code in content (e.g. DH10028 or 10028)
    const matchedOrder = pendingOrders.find((o) => {
      const shortCode = o.id.slice(-6).toUpperCase();
      return content.toUpperCase().includes(shortCode) || content.toUpperCase().includes(`DH${shortCode}`);
    });

    if (matchedOrder) {
      await this.prisma.order.update({
        where: { id: matchedOrder.id },
        data: {
          status: OrderStatus.PROCESSING,
        },
      });

      this.logger.log(`Order #${matchedOrder.id} marked as PAID via VietQR Webhook!`);

      // Realtime notification via WebSocket
      this.orderTrackingGateway.broadcastOrderStatus(
        matchedOrder.id,
        'PROCESSING',
      );

      return {
        success: true,
        message: `Order #${matchedOrder.id} updated to PROCESSING`,
        orderId: matchedOrder.id,
      };
    }

    return { success: true, message: 'Webhook received but no matching order found' };
  }
}
