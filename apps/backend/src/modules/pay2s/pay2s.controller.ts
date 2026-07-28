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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f4f5f7;
      color: #1a1a1a;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .card {
      background: #ffffff;
      border: 1px solid #f0edeb;
      border-radius: 24px;
      padding: 24px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
    }
    .header {
      text-align: center;
      margin-bottom: 18px;
    }
    .header .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(14, 104, 119, 0.08);
      color: #0e6877;
      border: 1px solid rgba(14, 104, 119, 0.2);
      font-size: 11px;
      font-weight: 800;
      padding: 4px 14px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header h1 {
      font-size: 18px;
      font-weight: 800;
      color: #1a1a1a;
      margin-top: 8px;
    }
    .amount-box {
      background: #fbf9f7;
      border: 1px solid #f0edeb;
      border-radius: 20px;
      padding: 16px;
      text-align: center;
      margin-bottom: 20px;
    }
    .amount-box .label {
      font-size: 11px;
      color: #526069;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .amount-box .value {
      font-size: 26px;
      font-weight: 800;
      color: #0e6877;
      margin-top: 4px;
    }
    .qr-container {
      background: #ffffff;
      border: 1px solid #f0edeb;
      border-radius: 20px;
      padding: 16px;
      text-align: center;
      margin-bottom: 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    }
    .qr-container img {
      width: 100%;
      max-width: 210px;
      height: auto;
      border-radius: 12px;
      display: block;
      margin: 0 auto;
    }
    .qr-actions {
      display: flex;
      gap: 10px;
      margin-top: 12px;
      justify-content: center;
    }
    .btn-qr-action {
      background: #0e6877;
      color: #ffffff;
      border: none;
      padding: 9px 16px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(14, 104, 119, 0.2);
    }
    .btn-qr-action:active { transform: scale(0.96); }
    .details-box {
      background: #fbf9f7;
      border: 1px solid #f0edeb;
      border-radius: 20px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .detail-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px dashed #e2e8f0;
    }
    .detail-row:last-child { border-bottom: none; }
    .detail-row .lbl {
      font-size: 12px;
      color: #526069;
      font-weight: 600;
    }
    .detail-row .val-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .detail-row .val {
      font-size: 13px;
      font-weight: 700;
      color: #1a1a1a;
    }
    .btn-small-copy {
      background: #ffffff;
      color: #0e6877;
      border: 1px solid #0e6877;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s;
    }
    .btn-small-copy:active { background: #0e6877; color: #ffffff; }
    .footer-note {
      text-align: center;
      font-size: 11px;
      color: #526069;
      margin-top: 12px;
      line-height: 1.5;
    }
    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #0e6877;
      color: #fff;
      padding: 10px 20px;
      border-radius: 30px;
      font-size: 13px;
      font-weight: 700;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      opacity: 0;
      pointer-events: none;
      z-index: 100;
    }
    .toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    .icon { width: 14px; height: 14px; fill: currentColor; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="badge">
        <svg class="icon" viewBox="0 0 24 24"><path d="M3 10h18M7 15h1m4 0h1m-9 5h16a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
        Chuyển khoản Ngân hàng
      </span>
      <h1>Đơn hàng #${orderId}</h1>
    </div>

    <div class="amount-box">
      <div class="label">Số tiền thanh toán</div>
      <div class="value">${amountFormatted} đ</div>
    </div>

    <div class="qr-container">
      <img id="qrImg" src="${qrUrl}" alt="Mã VietQR" />
      <div class="qr-actions">
        <button onclick="downloadQR()" class="btn-qr-action">
          <svg class="icon" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
          Tải / Lưu mã QR
        </button>
      </div>
    </div>

    <div class="details-box">
      <div class="detail-row">
        <span class="lbl">Ngân hàng</span>
        <span class="val">${bankCode}</span>
      </div>
      <div class="detail-row">
        <span class="lbl">Số tài khoản</span>
        <div class="val-group">
          <span class="val">${accNo}</span>
          <button class="btn-small-copy" onclick="copyText('${accNo}', 'Đã sao chép Số tài khoản!')">
            <svg class="icon" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
            Copy
          </button>
        </div>
      </div>
      <div class="detail-row">
        <span class="lbl">Chủ tài khoản</span>
        <span class="val">${accountName || 'SHOPQUIET STORE'}</span>
      </div>
      <div class="detail-row">
        <span class="lbl">Nội dung CK</span>
        <div class="val-group">
          <span class="val" style="color: #0e6877;">${orderInfo}</span>
          <button class="btn-small-copy" onclick="copyText('${orderInfo}', 'Đã sao chép Nội dung CK!')">
            <svg class="icon" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
            Copy
          </button>
        </div>
      </div>
    </div>

    <div class="footer-note">
      Sau khi chuyển khoản thành công, hệ thống sẽ tự động xác nhận.<br/>Cảm ơn bạn đã mua hàng!
    </div>
  </div>

  <div id="toast" class="toast">Đã sao chép!</div>

  <script>
    function copyText(text, msg) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => showToast(msg));
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast(msg);
      }
    }

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    }

    async function downloadQR() {
      const img = document.getElementById('qrImg');
      try {
        const resp = await fetch(img.src);
        const blob = await resp.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'VietQR_Order_${orderId}.png';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        showToast('✅ Đã tải mã QR về máy!');
      } catch (e) {
        window.open(img.src, '_blank');
        showToast('Bấm giữ hình ảnh để lưu mã QR');
      }
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
