# Deploy & Test (Mobile) - ShopQuiet

Tài liệu ngắn giúp build, chạy và kiểm tra ứng dụng trên điện thoại (LAN / ngrok).

## 1. Môi trường yêu cầu

- Node.js (>=18), pnpm
- Windows dev machine và điện thoại cùng mạng Wi‑Fi (hoặc dùng ngrok)

## 2. Build frontend

```
cd apps/zalo-mini-app
pnpm install
pnpm run build
```

Kết quả: thư mục `apps/zalo-mini-app/dist` chứa static assets.

## 3. Build & start backend (phục vụ static + API)

```
cd apps/backend
pnpm install
pnpm run build
node dist/main.js
```

Mặc định backend lắng nghe trên `0.0.0.0:3000` (có thể truy cập từ LAN).

## 4. Kiểm tra từ điện thoại

- Tìm IP LAN của máy dev (ví dụ `192.168.1.90`) bằng `ipconfig` (Windows).
- Trên điện thoại mở: `http://<PC_LAN_IP>:3000` (ví dụ `http://192.168.1.90:3000`).
- API docs: `http://<PC_LAN_IP>:3000/api/docs`.

## 5. Firewall

Nếu điện thoại không truy cập được, mở port 3000 trên Windows Firewall (PowerShell Admin):

```powershell
New-NetFirewallRule -DisplayName "Allow Node 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

## 6. Trường hợp cần HTTPS / remote testing

- Dùng `ngrok` để expose local server: `ngrok http 3000`.
- Nếu build frontend muốn point tới API ngrok, set `VITE_API_BASE_URL` trước khi build:

```powershell
#$env:VITE_API_BASE_URL='https://<ngrok-id>.ngrok.io/api'; pnpm run build
```

## 7. Biện pháp khắc phục lỗi thường gặp

- Lỗi `Failed to fetch`: kiểm tra `API_BASE_URL`. Mã đã cập nhật để mặc định sử dụng `window.location.origin + '/api'` nếu không đặt biến môi trường.
- Lỗi CORS: backend đã enable CORS cho mọi origin và header `x-zalo-user-id`, `ngrok-skip-browser-warning`.
- Zalo verification: backend có handler cho các đường dẫn `zalo_verifier*.html`.

## 8. Quy trình hàng ngày (Daily Workflow)

### Mỗi lần mở máy để Development (test local):
```powershell
# Chạy script tự động start ngrok + backend + frontend
pnpm dev:with-ngrok
```

Script này sẽ tự động:
- Start ngrok tunnel
- Update API URL vào `.env` file
- Start backend server (port 3000)
- Start frontend dev server (port 5173)

### Khi muốn deploy lên Zalo Mini App:
```powershell
# 1. Build frontend
cd apps/zalo-mini-app
pnpm run build

# 2. Deploy lên Zalo
npx zmp deploy
```

### Lưu ý quan trọng:
- Backend cần chạy liên tục trên port 3000
- Frontend dev server chạy trên port 5173
- Deploy chỉ cần build và deploy, không cần server chạy
- File `app-config.json` đã được cấu hình để load đúng file từ build output

## 9. Deploy Backend lên Render (Cloud Hosting)

### Tại sao cần deploy lên Render?
- Không cần máy local chạy liên tục
- URL ổn định với HTTPS
- Không cần ngrok
- Có thể scale khi cần

### Các bước deploy lên Render:

**1. Tạo tài khoản Render**
- Truy cập https://render.com
- Đăng ký bằng GitHub

**2. Kết nối GitHub repository**
- Trong Render dashboard, chọn "New +"
- Chọn "Web Service"
- Kết nối GitHub repository của bạn

**3. Cấu hình deployment**
- File `render.yaml` đã được tạo sẵn trong `apps/backend/`
- Render sẽ tự động đọc cấu hình từ file này
- Build command: `pnpm install && cd apps/backend && pnpm run build`
- Start command: `cd apps/backend && pnpm run start:prod`

**4. Cấu hình Environment Variables**
Trong Render dashboard, thêm các biến môi trường:
```
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres:[YOUR_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=your-anon-key
PORT=3000
```

**5. Deploy**
- Render sẽ tự động deploy khi bạn push code lên GitHub
- Hoặc click "Manual Deploy" trong dashboard

**6. Lấy URL backend**
- Sau khi deploy thành công, Render sẽ cung cấp URL như: `https://shopquiet-backend.onrender.com`
- Sử dụng URL này cho `VITE_API_BASE_URL` khi build frontend

### Cập nhật frontend để dùng Render URL:
```powershell
# Set API URL trước khi build
$env:VITE_API_BASE_URL='https://shopquiet-backend.onrender.com/api'
cd apps/zalo-mini-app
pnpm run build
npx zmp deploy
```

### Lưu ý:
- Render free tier sẽ sleep sau 15 phút không dùng
- Request đầu tiên sau sleep sẽ chậm hơn (~30s)
- Có thể upgrade lên paid plan để tránh sleep

## 10. Commit & Push (tùy chọn)

Sau khi kiểm tra, bạn có thể commit thay đổi và push lên remote:

```
git add .
git commit -m "fix: use window.origin for API base; bind backend to 0.0.0.0"
git push origin main
```

---

Nếu bạn muốn, mình có thể: (A) tạo PR tự động, (B) cấu hình Docker/ngrok script, hoặc (C) thêm file README chi tiết cho CI/CD.
