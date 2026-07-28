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
      background: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 28px;
      padding: 24px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header .badge {
      display: inline-block;
      background: rgba(14, 116, 144, 0.2);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      font-size: 11px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .header h1 {
      font-size: 20px;
      font-weight: 800;
      color: #fff;
      margin-top: 8px;
    }
    .amount-box {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1));
      border: 1.5px solid rgba(16, 185, 129, 0.3);
      border-radius: 20px;
      padding: 16px;
      text-align: center;
      margin-bottom: 20px;
    }
    .amount-box .label {
      font-size: 11px;
      color: #94a3b8;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .amount-box .value {
      font-size: 28px;
      font-weight: 800;
      color: #34d399;
      margin-top: 4px;
    }
    .qr-container {
      background: #fff;
      border-radius: 20px;
      padding: 16px;
      text-align: center;
      margin-bottom: 20px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }
    .qr-container img {
      width: 100%;
      max-width: 220px;
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
      background: #f1f5f9;
      color: #0f172a;
      border: none;
      padding: 8px 14px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-qr-action:active { transform: scale(0.96); }
    .details-box {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .detail-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #1e293b;
    }
    .detail-row:last-child { border-bottom: none; }
    .detail-row .lbl {
      font-size: 12px;
      color: #94a3b8;
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
      color: #f8fafc;
    }
    .btn-small-copy {
      background: #1e293b;
      color: #38bdf8;
      border: 1px solid #334155;
      padding: 4px 8px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-small-copy:active { background: #38bdf8; color: #0f172a; }
    .primary-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      font-size: 15px;
      font-weight: 800;
      border: none;
      border-radius: 18px;
      cursor: pointer;
      text-decoration: none;
      box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.4);
      transition: all 0.2s;
      margin-bottom: 10px;
    }
    .primary-btn:active { transform: scale(0.98); }
    .secondary-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px;
      background: #334155;
      color: #f8fafc;
      font-size: 14px;
      font-weight: 700;
      border: none;
      border-radius: 18px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .secondary-btn:active { background: #475569; }
    .footer-note {
      text-align: center;
      font-size: 11px;
      color: #64748b;
      margin-top: 16px;
      line-height: 1.5;
    }
    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #10b981;
      color: #fff;
      padding: 10px 20px;
      border-radius: 30px;
      font-size: 13px;
      font-weight: 700;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      opacity: 0;
      pointer-events: none;
      z-index: 100;
    }
    .toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="badge">Chuyển khoản Ngân hàng</span>
      <h1>Đơn hàng #${orderId}</h1>
    </div>

    <div class="amount-box">
      <div class="label">Số tiền cần thanh toán</div>
      <div class="value">${amountFormatted} đ</div>
    </div>

    <div class="qr-container">
      <img id="qrImg" src="${qrUrl}" alt="Mã VietQR" />
      <div class="qr-actions">
        <a href="${qrUrl}" download="VietQR_Order_${orderId}.png" target="_blank" class="btn-qr-action">
          📥 Lưu mã QR
        </a>
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
          <button class="btn-small-copy" onclick="copyText('${accNo}', 'Đã sao chép STK!')">Copy</button>
        </div>
      </div>
      <div class="detail-row">
        <span class="lbl">Chủ tài khoản</span>
        <span class="val">${accountName || 'SHOPQUIET STORE'}</span>
      </div>
      <div class="detail-row">
        <span class="lbl">Nội dung CK</span>
        <div class="val-group">
          <span class="val" style="color: #38bdf8;">${orderInfo}</span>
          <button class="btn-small-copy" onclick="copyText('${orderInfo}', 'Đã sao chép Nội dung CK!')">Copy</button>
        </div>
      </div>
    </div>

    <a href="${vietqrDeepLink}" class="primary-btn">
      📱 Mở App Ngân hàng
    </a>

    <button class="secondary-btn" onclick="copyText('${orderInfo}', 'Đã sao chép Nội dung CK!')">
      📋 Sao chép nội dung chuyển khoản
    </button>

    <div class="footer-note">
      Chuyển khoản xong hệ thống sẽ tự động xác nhận.<br/>Cảm ơn bạn đã mua hàng!
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
