import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderTrackingGateway } from '../websocket/websocket.gateway';
import * as crypto from 'crypto';

@Injectable()
export class Pay2sService {
  private readonly logger = new Logger(Pay2sService.name);

  constructor(
    private prisma: PrismaService,
    private orderTrackingGateway: OrderTrackingGateway,
  ) {}

  private async getSetting(key: string, defaultValue: string): Promise<string> {
    try {
      const setting = await this.prisma.siteSetting.findUnique({
        where: { key },
      });
      if (setting?.value) return setting.value;
    } catch (e) {
      this.logger.error(`Error reading setting ${key}:`, e);
    }
    return process.env[key] || defaultValue;
  }

  async createPaymentUrl(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    const partnerCode = await this.getSetting('PAY2S_PARTNER_CODE', 'pay2s');
    const accessKey = await this.getSetting('PAY2S_ACCESS_KEY', 'pay2s_access_key');
    const secretKey = await this.getSetting('PAY2S_SECRET_KEY', 'pay2s_secret_key');
    const endpoint = await this.getSetting(
      'PAY2S_ENDPOINT',
      'https://sandbox-payment.pay2s.vn/v1/gateway/api/create',
    );
    const bankAccounts = await this.getSetting('PAY2S_BANK_ACCOUNTS', '99999999|ACB');
    const redirectUrl = await this.getSetting(
      'PAY2S_REDIRECT_URL',
      `https://zalo-mini-app-shopquiet.onrender.com/orders/${order.id}/payment`,
    );
    const ipnUrl = await this.getSetting(
      'PAY2S_IPN_URL',
      'https://zalo-mini-app-shopquiet.onrender.com/api/pay2s/ipn',
    );
    const requestType = await this.getSetting('PAY2S_REQUEST_TYPE', 'pay2s');
    const feePercentStr = await this.getSetting('SERVICE_FEE_PERCENT', '0');
    const feePercent = parseFloat(feePercentStr) || 0;

    const baseAmount = Math.round(order.totalAmount);
    const feeAmount = Math.ceil(baseAmount * (feePercent / 100));
    const finalAmount = baseAmount + feeAmount;

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderInfo = `PAY${order.id}X${randomSuffix}`;
    const requestId = `REQ_${Date.now()}_${order.id}`;

    // HMAC Signature format according to pay2s.md:
    // accessKey&amount&bankAccounts=Array&ipnUrl&orderId&orderInfo&partnerCode&redirectUrl&requestId&requestType
    const rawSignature = `accessKey=${accessKey}&amount=${finalAmount}&bankAccounts=${bankAccounts}&ipnUrl=${ipnUrl}&orderId=${order.id}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const payload = {
      partnerCode,
      accessKey,
      requestId,
      amount: finalAmount,
      orderId: order.id,
      orderInfo,
      redirectUrl,
      ipnUrl,
      bankAccounts: [bankAccounts],
      requestType,
      signature,
    };

    this.logger.log(`[Pay2S Create] Request payload for order ${order.id}: ${JSON.stringify(payload)}`);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();
      this.logger.log(`[Pay2S Create] Gateway response: ${JSON.stringify(resData)}`);

      if (resData && (resData.payUrl || resData.shortLink)) {
        return {
          success: true,
          payUrl: resData.payUrl || resData.shortLink,
          orderId: order.id,
          orderInfo,
          amount: finalAmount,
        };
      }
    } catch (e: any) {
      this.logger.warn(`[Pay2S Create] Gateway API call error/fallback: ${e?.message || e}`);
    }

    // Production VietQR QuickLink fallback (Zero login prompts required)
    const [accNo, bankCode] = bankAccounts.split('|');
    const cleanBankCode = (bankCode || 'MB').trim();
    const cleanAccNo = (accNo || '0988776655').trim();
    
    const directQrUrl = `https://img.vietqr.io/image/${cleanBankCode}-${cleanAccNo}-compact2.png?amount=${finalAmount}&addInfo=${encodeURIComponent(
      orderInfo,
    )}&accountName=${encodeURIComponent('SHOPQUIET STORE')}`;

    return {
      success: true,
      payUrl: directQrUrl,
      orderId: order.id,
      orderInfo,
      amount: finalAmount,
    };
  }

  async handleIPN(body: any) {
    this.logger.log(`[Pay2S IPN] Received callback: ${JSON.stringify(body)}`);

    const {
      orderId,
      resultCode,
      message,
    } = body || {};

    if (resultCode !== 0 && resultCode !== '0') {
      this.logger.warn(`[Pay2S IPN] Payment failed or cancelled for order ${orderId}: ${message}`);
      return { resultCode: 1, message: 'Payment failed' };
    }

    const order = await this.prisma.order.findUnique({
      where: { id: String(orderId) },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    // Update order status to PROCESSING
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PROCESSING',
        paymentMethod: 'PAY2S',
      },
    });

    this.orderTrackingGateway.broadcastOrderStatus(order.id, 'PROCESSING');

    this.logger.log(`[Pay2S IPN] Order ${order.id} marked as PROCESSING via IPN`);
    return { resultCode: 0, message: 'Success' };
  }

  async handleHook(authorizationHeader: string, body: any) {
    this.logger.log(`[Pay2S Hook] Received webhook: ${JSON.stringify(body)}`);

    const expectedSecret = await this.getSetting('PAY2S_HOOK_SECRET', 'pay2s_hook_secret_token');
    const token = (authorizationHeader || '').replace(/^Bearer\s+/i, '').trim();

    if (expectedSecret && token !== expectedSecret) {
      this.logger.warn(`[Pay2S Hook] Invalid authorization bearer token: ${token}`);
    }

    const transactions = Array.isArray(body?.transactions) ? body.transactions : [];
    let processedCount = 0;

    for (const tx of transactions) {
      if (tx.transferType !== 'IN') continue;

      const content = tx.content || '';

      // Extract orderId from content formatted as PAY{orderId}X{randomDigits}
      const match = content.match(/PAY([a-zA-Z0-9_-]+)X\d+/i);
      if (!match) continue;

      const orderId = match[1];
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        this.logger.warn(`[Pay2S Hook] Order ${orderId} not found in DB`);
        continue;
      }

      // Update order status to PROCESSING
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PROCESSING',
          paymentMethod: 'PAY2S_HOOK',
        },
      });

      this.orderTrackingGateway.broadcastOrderStatus(order.id, 'PROCESSING');

      processedCount++;
      this.logger.log(`[Pay2S Hook] Successfully processed payment for Order ${order.id}`);
    }

    return { success: true, processed: processedCount };
  }
}
