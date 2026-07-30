import { Controller, Get, Post, Head, HttpCode, HttpStatus, Body } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return { status: 'ok', message: 'Server is running' };
  }

  @Head()
  @HttpCode(HttpStatus.OK)
  headHello() {
    return;
  }

  @Get('terms')
  getTerms() {
    return `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Điều khoản sử dụng - ShopQuiet Zalo Mini App</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; padding: 24px; max-width: 800px; margin: 0 auto; color: #1e293b; background-color: #f8fafc; }
          .container { background: #ffffff; padding: 32px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          h1 { color: #0e6877; font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
          h2 { margin-top: 24px; color: #0f766e; font-size: 18px; }
          ul { padding-left: 20px; }
          li { margin-bottom: 8px; }
          .footer { margin-top: 32px; font-size: 13px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>CHÍNH SÁCH BẢO MẬT & ĐIỀU KHOẢN SỬ DỤNG</h1>
          <p>Chào mừng bạn đến với <strong>ShopQuiet Mini App</strong> trên nền tảng Zalo.</p>
          
          <h2>1. Thu thập dữ liệu cá nhân</h2>
          <p>Khi bạn sử dụng ShopQuiet Mini App, ứng dụng chỉ thu thập các thông tin khi được bạn cho phép:</p>
          <ul>
            <li>Họ tên và Ảnh đại diện Zalo (để hiển thị thông tin tài khoản thành viên).</li>
            <li>Số điện thoại và Địa chỉ giao hàng (để liên hệ và giao hàng khi bạn đặt mua sản phẩm).</li>
          </ul>
          
          <h2>2. Mục đích sử dụng thông tin</h2>
          <ul>
            <li>Xử lý, đóng gói và vận chuyển đơn hàng thời trang.</li>
            <li>Cập nhật trạng thái đơn hàng và gửi mã ưu đãi thành viên.</li>
            <li>Hỗ trợ giải đáp thắc mắc của khách hàng qua kênh Chat trực tiếp.</li>
          </ul>
          
          <h2>3. Cam kết bảo mật thông tin</h2>
          <p>ShopQuiet cam kết không chia sẻ, bán hoặc trao đổi dữ liệu cá nhân của người dùng cho bất kỳ bên thứ ba nào, ngoại trừ đơn vị đối tác vận chuyển phục vụ việc giao nhận hàng.</p>
          
          <h2>4. Quyền hủy bỏ và xóa dữ liệu</h2>
          <p>Người dùng có toàn quyền hủy bỏ sự đồng ý và yêu cầu xóa dữ liệu cá nhân bất kỳ lúc nào thông qua phần Quản lý quyền ứng dụng trên ứng dụng Zalo.</p>

          <div class="footer">
            &copy; 2026 ShopQuiet E-Commerce. Tất cả quyền được bảo lưu.
          </div>
        </div>
      </body>
      </html>
    `;
  }

  @Post('zalo-webhook')
  @HttpCode(HttpStatus.OK)
  handleZaloWebhook(@Body() body: any) {
    console.log('Received Zalo Webhook event:', body);
    return { status: 'success', message: 'Zalo webhook event processed successfully' };
  }
}

