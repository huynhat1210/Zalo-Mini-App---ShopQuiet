# Zalo Mini App E-Commerce - ShopQuiet Monorepo

Hệ thống Thương Mại Điện Tử Doanh Nghiệp Tích Hợp Zalo Mini App & Admin CMS Multi-Platform.

## 📋 Tổng quan dự án

**ShopQuiet** là một hệ sinh thái thương mại điện tử hoàn chỉnh triển khai dưới dạng **Monorepo Architecture (pnpm workspaces)**. Hệ thống tích hợp trực tiếp với nền tảng Zalo Mini App SDK, cho phép người dùng mua sắm trực tiếp trên ứng dụng Zalo với trải nghiệm mobile-first hiện đại, mượt mà và bảo mật.

### 🎯 Các phân hệ chính

#### 📱 Zalo Mini App Client (`apps/zalo-mini-app`)
- **Trang chủ**: Banner carousel động, danh mục sản phẩm capsule, đồng hồ Flash Sale real-time, gợi ý cá nhân hóa AI Recommendations ("✨ Có thể bạn thích").
- **Chi tiết sản phẩm**: Gallery ảnh, bộ chọn màu/size với tồn kho real-time, đánh giá rating thực tế từ người mua.
- **Giỏ hàng & Thanh toán**: Cập nhật số lượng, áp mã Voucher giảm giá, chọn địa chỉ giao hàng, thanh toán qua **Cổng ZaloPay Sandbox/Production** & COD.
- **Tiến trình giao hàng (Timeline Widget)**: Theo dõi lịch trình đơn hàng 4 bước trực quan (`1. Đã nhận` ➔ `2. Đóng gói` ➔ `3. Đang giao` ➔ `4. Hoàn thành`) đính kèm mã vận đơn GHN.
- **Vòng quay may mắn (Gamification)**: Tích điểm thưởng thành viên Zalo & đổi mã Voucher VIP.
- **Hỗ trợ CSKH Live Chat**: Chát 1-on-1 trực tiếp với nhân viên qua WebSockets (Socket.IO).

#### 🛠️ Backend API (`apps/backend`)
- **Framework & ORM**: NestJS, TypeScript, Prisma ORM, PostgreSQL.
- **Authentication**: Zalo OAuth & JWT Token Auth.
- **Gemini AI Operations Engine**: Tự động phát hiện cảnh báo tồn kho thấp, đơn hàng tồn đọng, yêu cầu đổi trả và gợi ý lệnh xử lý 1-click cho Admin.
- **WebSocket Gateway**: Kết nối CSKH real-time.

#### 📊 Admin CMS Dashboard (`apps/cms`)
- **Quản lý sản phẩm**: Giao diện Bảng full-width responsive, chỉnh sửa trực tiếp giá/kho, nút "Lưu Tất Cả Thay Đổi" & phân trang.
- **Quản lý đơn hàng & Đổi trả**: Xử lý trạng thái đơn hàng, duyệt yêu cầu hoàn tiền/đổi trả của khách hàng.
- **Quản lý kho hàng Matrix**: Ma trận biến thể màu/size, cảnh báo tồn kho nguy cấp.
- **Trung tâm thông báo Admin Bell**: Chỉ hiển thị các cảnh báo vận hành doanh nghiệp quan trọng.

## 🏗️ Cấu trúc dự án (Monorepo)

```
Zalo-Mini-App---ShopQuiet/
├── apps/
│   ├── backend/              # NestJS Backend API Server
│   ├── cms/                  # React Admin CMS Dashboard
│   └── zalo-mini-app/        # Zalo Mini App Client (React + Vite + ZMP SDK)
├── .agents/                  # Context & Agent rules
├── package.json              # Root package configuration
├── pnpm-workspace.yaml       # PNPM Workspaces config
└── README.md                 # System Documentation
```

## 🚀 Công nghệ sử dụng

- **Monorepo Manager:** `pnpm` workspaces
- **Frontend Client:** React 18, Vite, Zalo Mini App SDK (`zmp-sdk`, `zmp-ui`), TailwindCSS
- **Admin CMS:** React 18, Vite, Lucide Icons, Recharts, TailwindCSS
- **Backend API:** NestJS, TypeScript, Prisma ORM, PostgreSQL, Socket.IO, Google Gemini 1.5 Flash API

## 📦 Hướng dẫn cài đặt & Khởi chạy

### 1. Cài đặt Dependencies
```bash
pnpm install
```

### 2. Khởi chạy chế độ Development
Chạy đồng toàn bộ hệ thống (Backend, CMS, Zalo Mini App):
```bash
pnpm dev
```

Hoặc chạy riêng từng phân hệ:
- **Backend API:** `pnpm dev:backend`
- **Admin CMS:** `pnpm dev:cms`
- **Zalo Mini App:** `pnpm dev:zalo`

### 3. Build Production
```bash
pnpm build
```

## 📄 License

MIT License - **ShopQuiet E-Commerce Team**
