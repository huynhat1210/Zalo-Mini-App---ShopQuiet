# Zalo Mini App E-Commerce - ShopQuiet Monorepo

Hệ thống Thương Mại Điện Tử Doanh Nghiệp Tích Hợp Zalo Mini App & Admin CMS Multi-Platform.

---

## 📋 Tổng Quan Dự Án

**ShopQuiet** là một hệ sinh thái thương mại điện tử hoàn chỉnh triển khai dưới dạng **Monorepo Architecture (pnpm workspaces)**. Hệ thống tích hợp trực tiếp với nền tảng Zalo Mini App SDK, cho phép người dùng mua sắm trực tiếp trên ứng dụng Zalo với trải nghiệm mobile-first hiện đại, mượt mà và bảo mật.

### 🎯 Các Phân Hệ Chính

- **📱 Zalo Mini App Client (`apps/zalo-mini-app`)**: Giao diện người dùng mua sắm trên Zalo, hỗ trợ voucher, giỏ hàng, ván quay may mắn, thanh toán ZaloPay & COD.
- **📊 Admin CMS Dashboard (`apps/cms`)**: Trang quản trị người bán, quản lý đơn hàng, kho hàng, phân tích doanh thu real-time và chiến dịch marketing.
- **🛠️ Backend API Server (`apps/backend`)**: NestJS API, Prisma ORM, PostgreSQL, tích hợp Socket.io thông báo đơn hàng thời gian thực và Gemini AI Ops Engine.

---

## � Keycloak IAM Integration

ShopQuiet sử dụng **Keycloak** làm giải pháp Quản lý danh tính và quyền truy cập (IAM) trung tâm, cung cấp:

- ✅ **Single Sign-On (SSO)**: Đăng nhập một lần truy cập toàn bộ hệ thống
- ✅ **OpenID Connect**: Chuẩn bảo mật ngành công nghiệp
- ✅ **JWT Token Management**: Quản lý token tự động với khóa xoay vòng
- ✅ **Role-Based Access Control**: Phân quyền linh hoạt

### 🚀 Khởi Chạy Keycloak

```bash
# Khởi động Keycloak (mặc định: admin/admin123)
docker compose up -d

# Truy cập Admin Console
http://localhost:8080/admin
```

### 📖 Hướng Dẫn Cấu Hình

- **Bắt đầu nhanh:** [KEYCLOAK_QUICK_START.md](./KEYCLOAK_QUICK_START.md)
- **Hướng dẫn chi tiết:** [KEYCLOAK_SETUP.md](./KEYCLOAK_SETUP.md)
- **Tổng quan tích hợp:** [KEYCLOAK_INTEGRATION_SUMMARY.md](./KEYCLOAK_INTEGRATION_SUMMARY.md)

---

## �💻 Hướng Dẫn Khởi Chạy Dự Án Trên IDE (VS Code)

### Bước 1: Cài đặt thư viện

Mở Terminal trong VS Code và chạy lệnh:

```bash
pnpm install
```

### Bước 2: Chạy dự án

Chạy duy nhất 1 lệnh sau để khởi động toàn bộ hệ thống:

```bash
pnpm dev
```

Sau khi chạy xong, các dịch vụ sẽ tự động hoạt động tại:

- **Trang Quản trị Admin CMS**: `http://localhost:5173` (Quản lý sản phẩm, đơn hàng, chiến dịch marketing)
- **Backend API & Socket.io**: `http://localhost:3001` (Xử lý dữ liệu & thông báo thời gian thực)
- **Zalo Mini App Client**: `http://localhost:3002`

---

## 📱 Hướng Dẫn Deploy & Gen QR Code Test Zalo Mini App

Để deploy và tạo mã QR Code trải nghiệm ứng dụng trực tiếp trên Zalo điện thoại:

1. Mở Terminal và di chuyển vào thư mục Mini App:
   ```bash
   cd apps/zalo-mini-app
   ```
2. Đăng nhập tài khoản Zalo Developer (nếu chưa đăng nhập):
   ```bash
   zmp login
   ```
3. Chạy lệnh Deploy & Gen QR Code:
   ```bash
   zmp deploy
   ```
4. Màn hình Terminal sẽ xuất hiện **Mã QR Code**. Dùng ứng dụng **Zalo trên điện thoại quét mã QR** để trải nghiệm ứng dụng trực tiếp.

---

## 🚀 Chạy Môi Trường Local

- PostgreSQL chạy tại máy qua dịch vụ `postgresql-x64-18`.
- Keycloak chạy qua Docker Compose tại `http://localhost:8080`.
- Backend, CMS và Campaign đọc cấu hình từ các file `.env` trong từng ứng dụng.

---

## 🏗️ Cấu Trúc Dự Án (Monorepo)

```
Zalo-Mini-App---ShopQuiet/
├── apps/
│   ├── backend/              # NestJS Backend API Server & Socket.io
│   ├── cms/                  # React Admin CMS Dashboard (localhost:5173)
│   └── zalo-mini-app/        # Zalo Mini App Client (React + Vite + ZMP SDK)
├── .agents/                  # Context & Agent rules
├── package.json              # Root package configuration
├── pnpm-workspace.yaml       # PNPM Workspaces config
└── README.md                 # System Documentation
```

---

## 📄 License

MIT License - **ShopQuiet E-Commerce Team**
