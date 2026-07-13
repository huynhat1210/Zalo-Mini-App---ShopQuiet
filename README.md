# Zalo Mini App E-Commerce Monorepo

Dự án Đồ án tốt nghiệp: **Hệ thống E-Commerce tích hợp Zalo Mini App**.

## Cấu trúc thư mục (Monorepo)

- **`apps/frontend`**: Ứng dụng Next.js (Admin Dashboard / Web Portal).
- **`apps/backend`**: NestJS backend API sử dụng TypeScript, Node.js.
- **`apps/zalo-mini-app`**: Zalo Mini App Client chạy trực tiếp trên ứng dụng Zalo (Sử dụng React + Vite + ZMP SDK).
- **`.agents/skills/figma-reader`**: Skill AI Agent giúp đọc và chuyển đổi Figma UI sang React Components.

## Hướng dẫn cài đặt & Chạy ứng dụng

### Yêu cầu hệ thống
- **Node.js** (Phiên bản khuyến nghị: >= 18.x)
- **PNPM** (Cài đặt bằng cách chạy `npm install -g pnpm`)

### Cài đặt dependencies
Chạy lệnh sau tại thư mục gốc để tự động cài đặt dependencies cho toàn bộ các dự án con:
```bash
pnpm install
```

### Chạy chế độ Development
Để khởi chạy đồng thời tất cả các ứng dụng:
```bash
pnpm dev
```

Hoặc chạy lẻ từng phần:
- Chỉ chạy Backend: `pnpm dev:backend`
- Chỉ chạy Frontend Admin: `pnpm dev:frontend`
- Chỉ chạy Zalo Mini App: `pnpm dev:zalo`
