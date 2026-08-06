import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderTrackingGateway } from '../websocket/websocket.gateway';
import { PaymentStatus, OrderStatus } from '@prisma/client';
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

  async createPaymentUrl(orderId: string, requesterId: string, isAdmin = false) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    if (!isAdmin && order.zaloUserId !== requesterId) {
      throw new UnauthorizedException('You cannot pay for this order.');
    }
    if (order.paymentMethod !== 'PAY2S' || order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new UnauthorizedException('Order is not awaiting Pay2S payment.');
    }

    const partnerCode = await this.getSetting('PAY2S_PARTNER_CODE', 'pay2s');
    const accessKey = await this.getSetting('PAY2S_ACCESS_KEY', 'pay2s_access_key');
    const secretKey = await this.getSetting('PAY2S_SECRET_KEY', 'pay2s_secret_key');
    const endpoint = await this.getSetting(
      'PAY2S_ENDPOINT',
      'https://sandbox-payment.pay2s.vn/v1/gateway/api/create',
    );
    const bankAccounts = await this.getSetting('PAY2S_BANK_ACCOUNTS', '99999999|ACB');
    const appBaseUrl = await this.getSetting('APP_BASE_URL', 'http://localhost:3000');
    const redirectUrl = await this.getSetting(
      'PAY2S_REDIRECT_URL',
      `${appBaseUrl}/orders/${order.id}/payment`,
    );
    const configuredIpnUrl = await this.getSetting('PAY2S_IPN_URL', `${appBaseUrl}/pay2s/ipn`);
    const ipnUrl = configuredIpnUrl.replace(/\/api\/pay2s\/ipn\/?$/, '/pay2s/ipn');
    const requestType = await this.getSetting('PAY2S_REQUEST_TYPE', 'pay2s');
    const feePercentStr = await this.getSetting('SERVICE_FEE_PERCENT', '0');
    const feePercent = parseFloat(feePercentStr) || 0;

    const baseAmount = Math.round(Number(order.totalAmount));
    const feeAmount = Math.ceil(baseAmount * (feePercent / 100));
    const finalAmount = baseAmount + feeAmount;

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderInfo = `PAY${order.id}X${randomSuffix}`;
    const requestId = `REQ_${Date.now()}_${order.id}`;

    const rawSignature = `accessKey=${accessKey}&amount=${finalAmount}&bankAccounts=${bankAccounts}&ipnUrl=${ipnUrl}&orderId=${order.id}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    // Create PaymentTransaction entry in ledger
    await this.prisma.paymentTransaction.upsert({
      where: { transactionCode: requestId },
      create: {
        orderId: order.id,
        transactionCode: requestId,
        provider: 'PAY2S',
        amount: finalAmount,
        currency: 'VND',
        status: PaymentStatus.PENDING,
        rawResponse: { orderInfo, bankAccounts, redirectUrl, ipnUrl },
      },
      update: {
        amount: finalAmount,
        status: PaymentStatus.PENDING,
      },
    });

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

    this.logger.log(`[Pay2S Create] Creating payment for order ${order.id}, amount ${finalAmount}`);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();
      if (!response.ok) {
        this.logger.warn(`[Pay2S Create] Gateway returned HTTP ${response.status} for order ${order.id}`);
      }

      const gatewayData = resData?.data || resData;
      if (response.ok && gatewayData && (gatewayData.payUrl || gatewayData.shortLink)) {
        return {
          success: true,
          payUrl: gatewayData.payUrl || gatewayData.shortLink,
          orderId: order.id,
          orderInfo,
          amount: finalAmount,
        };
      }
    } catch (e: any) {
      this.logger.warn(`[Pay2S Create] Gateway unavailable for order ${order.id}: ${e?.message || e}`);
    }

    const useSandboxDemo = await this.getSetting('PAY2S_USE_SANDBOX', 'true');
    if (useSandboxDemo === 'true' || endpoint.includes('sandbox')) {
      const demoUrl = `https://sandbox.pay2s.vn/demo/transfer_demo.html?amount=${finalAmount}&content=${encodeURIComponent(orderInfo)}&orderId=${order.id}`;
      return {
        success: true,
        payUrl: demoUrl,
        orderId: order.id,
        orderInfo,
        amount: finalAmount,
      };
    }

    const [accNo, bankCode] = bankAccounts.split('|');
    const cleanBankCode = (bankCode || 'MB').trim();
    const cleanAccNo = (accNo || '0988776655').trim();
    const accountName = await this.getSetting('PAY2S_ACCOUNT_NAME', 'SHOPQUIET STORE');
    
    const payPageUrl = `${appBaseUrl}/pay/order/${order.id}?info=${encodeURIComponent(orderInfo)}&amount=${finalAmount}&bank=${cleanBankCode}&acc=${cleanAccNo}&name=${encodeURIComponent(accountName)}`;

    return {
      success: true,
      payUrl: payPageUrl,
      orderId: order.id,
      orderInfo,
      amount: finalAmount,
    };
  }

  async handleIPN(body: any, authorizationHeader?: string) {
    this.logger.log(`[Pay2S IPN] Received callback: ${JSON.stringify(body)}`);
    await this.assertWebhookSecret(authorizationHeader, 'PAY2S_IPN_SECRET');

    const {
      orderId,
      resultCode,
      message,
      requestId,
    } = body || {};

    const idempotencyKey = requestId || `ipn_${Date.now()}_${orderId}`;
    try {
      await this.prisma.paymentWebhookEvent.create({
        data: {
          provider: 'PAY2S',
          eventId: requestId || null,
          idempotencyKey,
          eventType: 'IPN_CALLBACK',
          payload: body,
          processed: true,
          processedAt: new Date(),
        },
      });
    } catch (e) {
      this.logger.debug(`[Pay2S IPN] Webhook event already recorded for key ${idempotencyKey}`);
    }

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

    if (order.paymentMethod !== 'PAY2S' || order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new UnauthorizedException('Order is not awaiting Pay2S payment.');
    }

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PROCESSING,
          paymentMethod: 'PAY2S',
        },
      }),
      this.prisma.paymentTransaction.updateMany({
        where: { orderId: order.id },
        data: {
          status: PaymentStatus.SUCCESS,
        },
      }),
    ]);

    this.orderTrackingGateway.broadcastOrderStatus(order.id, 'PROCESSING');

    this.logger.log(`[Pay2S IPN] Order ${order.id} marked as PROCESSING via IPN`);
    return { resultCode: 0, message: 'Success' };
  }

  async handleHook(authorizationHeader: string, body: any) {
    this.logger.log(`[Pay2S Hook] Received webhook: ${JSON.stringify(body)}`);

    await this.assertWebhookSecret(authorizationHeader, 'PAY2S_HOOK_SECRET');

    let transactions: any[] = [];
    if (Array.isArray(body?.transactions)) {
      transactions = body.transactions;
    } else if (Array.isArray(body?.data)) {
      transactions = body.data;
    } else if (body?.data && typeof body.data === 'object') {
      transactions = [body.data];
    } else if (Array.isArray(body)) {
      transactions = body;
    } else if (body && typeof body === 'object') {
      transactions = [body];
    }

    let processedCount = 0;

    for (const tx of transactions) {
      if (tx.transferType && String(tx.transferType).toUpperCase() !== 'IN') continue;

      const content = String(
        tx.content ||
        tx.description ||
        tx.transactionContent ||
        tx.transferContent ||
        tx.orderId ||
        tx.order_id ||
        '',
      );

      let orderId: string | null = null;
      const matchPAY = content.match(/PAY([a-zA-Z0-9_-]+)X\d+/i);
      if (matchPAY) {
        orderId = matchPAY[1];
      }
      if (!orderId) {
        const matchSQ = content.match(/(SQ-\d+)/i);
        if (matchSQ) orderId = matchSQ[1];
      }
      // Pay2S code structures do not allow separators in the prefix, so
      // normalize SQ12345 back to ShopQuiet's canonical order id SQ-12345.
      if (!orderId) {
        const compactShopQuietCode = content.match(/\bSQ(\d{5})\b/i);
        if (compactShopQuietCode) orderId = `SQ-${compactShopQuietCode[1]}`;
      }
      if (!orderId && (tx.orderId || tx.order_id)) {
        orderId = String(tx.orderId || tx.order_id);
      }

      if (!orderId) continue;

      const idempotencyKey = tx.id ? `hook_${tx.id}` : `hook_${Date.now()}_${orderId}`;
      try {
        await this.prisma.paymentWebhookEvent.create({
          data: {
            provider: 'PAY2S',
            eventId: tx.id ? String(tx.id) : null,
            idempotencyKey,
            eventType: 'HOOK_CALLBACK',
            payload: tx,
            processed: true,
            processedAt: new Date(),
          },
        });
      } catch (e) {
        this.logger.debug(`[Pay2S Hook] Hook event already recorded: ${idempotencyKey}`);
      }

      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        this.logger.warn(`[Pay2S Hook] Order ${orderId} not found in DB`);
        continue;
      }
      if (order.paymentMethod !== 'PAY2S' || order.status !== OrderStatus.PENDING_PAYMENT) {
        this.logger.warn(`[Pay2S Hook] Order ${orderId} is not pending Pay2S payment`);
        continue;
      }

      await this.prisma.$transaction([
        this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PROCESSING,
            paymentMethod: 'PAY2S',
          },
        }),
        this.prisma.paymentTransaction.updateMany({
          where: { orderId: order.id },
          data: {
            status: PaymentStatus.SUCCESS,
          },
        }),
      ]);

      this.orderTrackingGateway.broadcastOrderStatus(order.id, 'PROCESSING');

      processedCount++;
      this.logger.log(`[Pay2S Hook] Successfully processed payment for Order ${order.id}`);
    }

    return { success: true, processed: processedCount };
  }

  private async assertWebhookSecret(authorizationHeader: string | undefined, settingKey: string) {
    const expectedSecret = (await this.getSetting(settingKey, '')).trim();
    const token = (authorizationHeader || '').replace(/^Bearer\s+/i, '').trim();
    if (!expectedSecret || !token || token !== expectedSecret) {
      const sandbox = (await this.getSetting('PAY2S_USE_SANDBOX', 'false')).trim().toLowerCase() === 'true';
      if (sandbox) {
        this.logger.warn(`[Pay2S Webhook] Accepting callback with non-matching authorization in sandbox mode.`);
        return;
      }
      throw new UnauthorizedException('Webhook authorization is invalid.');
    }
  }
}
