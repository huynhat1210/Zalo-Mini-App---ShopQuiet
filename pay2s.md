# Pay2S Integration (Sandbox)

Hướng dẫn cấu hình và debug nhanh luồng Pay2S trong dự án.

## Các key trong Settings

| Key | Ý nghĩa |
| --- | --- |
| `PAY2S_PARTNER_CODE` | Partner Code do Pay2S cấp |
| `PAY2S_ACCESS_KEY` | Access Key |
| `PAY2S_SECRET_KEY` | Secret Key dùng ký HMAC |
| `PAY2S_ENDPOINT` | Endpoint tạo link (sandbox mặc định `https://sandbox-payment.pay2s.vn/v1/gateway/api/create`) |
| `PAY2S_BANK_ACCOUNTS` | Mỗi dòng `accountNumber|BANKCODE` (ví dụ `99999999|ACB`) |
| `PAY2S_REDIRECT_URL` | (optional) URL redirect sau thanh toán, nếu trống dùng `<origin>/orders/{id}/payment` |
| `PAY2S_IPN_URL` | (optional) IPN mặc định `<origin>/api/pay2s/ipn` |
| `PAY2S_REQUEST_TYPE` | Mặc định `pay2s` |
| `PAY2S_PARTNER_NAME` | Tên hiển thị đối tác |
| `PAY2S_HOOK_SECRET` | Bearer token cho webhook Hook (Pay2S gửi vào header Authorization) |
| `SERVICE_FEE_PERCENT` / `SERVICE_FEE` / `NEXT_PUBLIC_SERVICE_FEE` | Phí nền tảng (%) dùng cộng vào số tiền thanh toán |
| `QR_PAYMENT_ENABLED` | `true`/`false`: bật/tắt phương thức QR truyền thống |

Seed đã thêm đầy đủ key (không ghi đè giá trị hiện có).

## Các endpoint đã triển khai

- `POST /api/orders/:id/pay2s`  
  Tạo link Pay2S, ký HMAC SHA256 với chuỗi:  
  `accessKey&amount&bankAccounts=Array&ipnUrl&orderId&orderInfo&partnerCode&redirectUrl&requestId&requestType`  
  Số tiền = `total_amount + ceil(total_amount * fee%)`. `orderInfo` dạng `PAY{orderId}X{6-digit}` để nhận diện trong webhook.

- `POST /api/pay2s/ipn`  
  Xử lý IPN của Pay2S (resultCode = 0). Kiểm tra chữ ký HMAC SHA256 với `PAY2S_ACCESS_KEY/SECRET_KEY`, kiểm tra amount (đã gồm fee) và set order `paid`, `payment_method=pay2s`, `payment_reference=transId`.

- `POST /api/pay2s/hook`  
  Dùng cho Hook giao dịch ngân hàng. Header cần `Authorization: Bearer <PAY2S_HOOK_SECRET>`. Payload dạng `{ transactions: [...] }`.  
  - Chỉ xử lý `transferType === "IN"`.  
  - Tìm order từ `content` chứa `PAY{orderId}X...`.  
  - Kiểm tra amount = `total_amount + fee`.  
  - Nếu khớp, cập nhật `paid`, `payment_method=pay2s_hook`, `payment_reference=transactionNumber`.  
  - Trả `{success:true}` để Pay2S dừng retry.

- `GET /api/payment-config`  
  Trả `qrEnabled` lấy từ `QR_PAYMENT_ENABLED`.

## Frontend

- Màn thanh toán: nếu `QR_PAYMENT_ENABLED=false` thì ẩn lựa chọn QR, mặc định Pay2S.  
- Sau khi `paid` hoặc Pay2S redirect `resultCode=0`, trang tự `replace` sang `/orders/{id}/confirmation`.
- Trang confirmation hiển thị spinner “đang xử lý” khi order chưa `paid` và tự poll.

## Cách cấu hình webhook Pay2S (sandbox)

1. Deploy/public URL (không dùng localhost) và nhập vào Pay2S webhook: `https://your-domain.com/api/pay2s/hook`.
2. Lấy token Pay2S cấp cho webhook, đặt vào Settings `PAY2S_HOOK_SECRET`.  
3. Chọn sự kiện “Nhận tiền” (IN) hoặc “Gửi & nhận” tùy nhu cầu.

## Test nhanh webhook

Dùng token của webhook và gửi thử:

```bash
curl -X POST https://your-domain.com/api/pay2s/hook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <PAY2S_HOOK_SECRET>" \
  -d '{
    "transactions": [{
      "id": "test1",
      "gateway": "ACB",
      "transactionDate": "2025-04-01 00:02:18",
      "transactionNumber": "TXN1",
      "accountNumber": "123",
      "content": "PAY861X123456",
      "transferType": "IN",
      "transferAmount": 44000,
      "checksum": "abc"
    }]
  }'
```
Đảm bảo `content` chứa `PAY{orderId}X...` và `transferAmount` bằng tổng đơn + phí. Log server có `[Pay2S Hook] processed` hoặc cảnh báo mismatch.

## Lưu ý vận hành

- Số tiền Pay2S cần thanh toán luôn gồm phí nền tảng (%).  
- Nếu Pay2S không gọi webhook: kiểm tra History trên portal; nếu trống, khả năng URL/SSL hoặc token sai.  
- Nếu webhook gọi nhưng không update: xem log cảnh báo “amount mismatch” hoặc không bắt được `orderId` trong content.  
- QR truyền thống có thể bật/tắt bằng `QR_PAYMENT_ENABLED` trong Settings.


## <!-- Test -->
Để vào sandbox test ạ
Pay2S - Giải pháp thanh toán tự động, biến động số dư
user sandbox: pay2s

- Giả lập chuyển tiên: https://sandbox.pay2s.vn/demo/transfer_demo.html

- Docs https://docs.pay2s.vn/api/gioi-thieu.html

- Sandbox: https://sandbox.pay2s.vn/webhooks