import { Controller, Post, Get, Param, Query, Body, Headers, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { Pay2sService } from './pay2s.service';
import type { Response } from 'express';

@Controller()
export class Pay2sController {
  constructor(private readonly pay2sService: Pay2sService) {}

  @Post('orders/:id/pay2s')
  async createPay2sUrl(@Param('id') id: string) {
    return this.pay2sService.createPaymentUrl(id);
  }

  @Post('api/orders/:id/pay2s')
  async createPay2sUrlApi(@Param('id') id: string) {
    return this.pay2sService.createPaymentUrl(id);
  }

  /** Self-hosted interactive payment page: QR + deep link buttons */
  @Get('pay/order/:id')
  async renderPaymentPage(
    @Param('id') orderId: string,
    @Query('info') orderInfo: string,
    @Query('amount') amount: string,
    @Query('bank') bankCode: string,
    @Query('acc') accNo: string,
    @Query('name') accountName: string,
    @Res() res: Response,
  ) {
    const amountNum = parseInt(amount) || 0;
    const amountFormatted = amountNum.toLocaleString('vi-VN');
    const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accNo}-compact2.png?amount=${amountNum}&addInfo=${encodeURIComponent(orderInfo || '')}&accountName=${encodeURIComponent(accountName || 'SHOPQUIET')}`;
    
    // VietQR deep link to open banking apps directly
    const vietqrDeepLink = `https://dl.vietqr.io/pay?app=vietqr&ba=${accNo}@${bankCode}&am=${amountNum}&tn=${encodeURIComponent(orderInfo || '')}`;

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Thanh toán đơn hàng #${orderId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #0e6877 0%, #0a4f5c 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .card { background: #fff; border-radius: 24px; padding: 28px 24px; max-width: 400px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .header { text-align: center; margin-bottom: 20px; }
    .header h1 { font-size: 18px; color: #1a1a1a; font-weight: 800; }
    .header p { font-size: 13px; color: #666; margin-top: 4px; }
    .amount-box { background: linear-gradient(135deg, #fff7ed, #fef3c7); border: 2px solid #f59e0b; border-radius: 16px; padding: 16px; text-align: center; margin-bottom: 20px; }
    .amount-box .label { font-size: 12px; color: #92400e; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .amount-box .value { font-size: 28px; font-weight: 900; color: #d97706; margin-top: 4px; }
    .qr-section { text-align: center; margin-bottom: 20px; }
    .qr-section img { width: 220px; height: 220px; border-radius: 12px; border: 2px solid #e5e7eb; }
    .qr-section .hint { font-size: 11px; color: #999; margin-top: 8px; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #f0f0f0; font-size: 13px; }
    .info-row .lbl { color: #888; }
    .info-row .val { color: #333; font-weight: 700; text-align: right; max-width: 60%; word-break: break-all; }
    .btn-open-bank { display: block; width: 100%; padding: 16px; background: linear-gradient(135deg, #0e6877, #0a8f6f); color: #fff; font-size: 16px; font-weight: 800; border: none; border-radius: 16px; cursor: pointer; margin-top: 20px; text-align: center; text-decoration: none; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(14,104,119,0.4); }
    .btn-open-bank:active { transform: scale(0.98); }
    .btn-copy { display: block; width: 100%; padding: 14px; background: #f8fafc; color: #0e6877; font-size: 14px; font-weight: 700; border: 2px solid #0e6877; border-radius: 16px; cursor: pointer; margin-top: 10px; text-align: center; }
    .btn-copy:active { background: #e0f2fe; }
    .footer { text-align: center; margin-top: 16px; font-size: 11px; color: #aaa; }
    .copied { background: #dcfce7 !important; color: #166534 !important; border-color: #166534 !important; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>💳 Thanh toán đơn hàng</h1>
      <p>Mã đơn: <strong>#${orderId}</strong></p>
    </div>

    <div class="amount-box">
      <div class="label">Số tiền thanh toán</div>
      <div class="value">${amountFormatted} đ</div>
    </div>

    <div class="qr-section">
      <img src="${qrUrl}" alt="Mã QR chuyển khoản" />
      <p class="hint">Quét mã QR bằng app ngân hàng (nếu dùng máy khác)</p>
    </div>

    <div style="padding: 0 4px;">
      <div class="info-row">
        <span class="lbl">Ngân hàng</span>
        <span class="val">${bankCode}</span>
      </div>
      <div class="info-row">
        <span class="lbl">Số tài khoản</span>
        <span class="val">${accNo}</span>
      </div>
      <div class="info-row">
        <span class="lbl">Chủ tài khoản</span>
        <span class="val">${accountName || 'SHOPQUIET'}</span>
      </div>
      <div class="info-row">
        <span class="lbl">Nội dung CK</span>
        <span class="val" id="transferContent">${orderInfo}</span>
      </div>
    </div>

    <a href="${vietqrDeepLink}" class="btn-open-bank">
      📱 Mở App Ngân hàng để chuyển khoản
    </a>

    <button class="btn-copy" id="btnCopy" onclick="copyContent()">
      📋 Sao chép nội dung chuyển khoản
    </button>

    <div class="footer">
      Sau khi chuyển khoản thành công, đơn hàng sẽ tự động được xác nhận.<br/>
      ShopQuiet &copy; 2026
    </div>
  </div>

  <script>
    function copyContent() {
      const text = document.getElementById('transferContent').innerText;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => showCopied());
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showCopied();
      }
    }
    function showCopied() {
      const btn = document.getElementById('btnCopy');
      btn.textContent = '✅ Đã sao chép!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = '📋 Sao chép nội dung chuyển khoản';
        btn.classList.remove('copied');
      }, 2000);
    }
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get('pay2s/ipn')
  @Get('api/pay2s/ipn')
  @Get('api/v1/pay2s/ipn')
  async checkIPNGet() {
    return {
      status: 'active',
      message: 'Pay2S IPN endpoint is online (expects POST requests from Pay2S gateway)',
    };
  }

  @Post('pay2s/ipn')
  @Post('api/pay2s/ipn')
  @Post('api/v1/pay2s/ipn')
  @HttpCode(HttpStatus.OK)
  async handleIPN(@Body() body: any) {
    return this.pay2sService.handleIPN(body);
  }

  @Get('pay2s/hook')
  @Get('api/pay2s/hook')
  @Get('api/v1/pay2s/hook')
  async checkHookGet() {
    return {
      status: 'active',
      message: 'Pay2S Webhook endpoint is online (expects POST requests with Bearer token)',
    };
  }

  @Post('pay2s/hook')
  @Post('api/pay2s/hook')
  @Post('api/v1/pay2s/hook')
  @HttpCode(HttpStatus.OK)
  async handleHook(@Headers('authorization') auth: string, @Body() body: any) {
    return this.pay2sService.handleHook(auth, body);
  }
}
