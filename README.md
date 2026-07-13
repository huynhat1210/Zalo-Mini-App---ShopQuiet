# Zalo Mini App E-Commerce - ShopQuiet

Dự án Đồ án tốt nghiệp: **Hệ thống E-Commerce tích hợp Zalo Mini App**.

## 📋 Tổng quan dự án

ShopQuiet là một hệ thống thương mại điện tử hoàn chỉnh được tích hợp với nền tảng Zalo Mini App, cho phép người dùng mua sắm trực tiếp trong ứng dụng Zalo một cách thuận tiện và nhanh chóng.

### 🎯 Tính năng chính

#### Zalo Mini App Client (apps/zalo-mini-app)
- **Trang chủ**: Hiển thị banner carousel, danh mục sản phẩm, và sản phẩm nổi bật
- **Tìm kiếm thông minh**: Sử dụng debounce để tối ưu hóa tìm kiếm sản phẩm
- **Pull-to-Refresh**: Kéo xuống để làm mới dữ liệu (sản phẩm, banner, danh mục)
- **Giỏ hàng**: Quản lý giỏ hàng, cập nhật số lượng, kích thước sản phẩm
- **Yêu thích**: Lưu sản phẩm yêu thích để xem sau
- **Thông báo**: Hiển thị thông báo đơn hàng và hệ thống
- **Lịch sử đơn hàng**: Xem các đơn hàng đang xử lý, đã hoàn thành, hủy, v.v.
- **Hồ sơ cá nhân**: Quản lý thông tin người dùng, địa chỉ giao hàng, phương thức thanh toán
- **Empty States**: Component hiển thị trạng thái trống khi không có dữ liệu

#### Backend API (apps/backend)
- **Authentication**: Xác thực người dùng qua Zalo OAuth
- **Product Management**: Quản lý sản phẩm, danh mục, banner
- **Order Management**: Xử lý đơn hàng, trạng thái đơn hàng
- **Cart Management**: Quản lý giỏ hàng người dùng
- **Notification System**: Gửi thông báo cho người dùng
- **CMS Settings**: Quản lý cấu hình hệ thống

#### Frontend Admin (apps/frontend)
- **Dashboard**: Tổng quan hệ thống
- **Product Management**: Thêm, sửa, xóa sản phẩm
- **Order Management**: Quản lý đơn hàng
- **User Management**: Quản lý người dùng
- **Analytics**: Thống kê doanh thu, người dùng

## 🏗️ Cấu trúc thư mục (Monorepo)

```
Zalo-Mini-App---ShopQuiet/
├── apps/
│   ├── backend/              # NestJS Backend API
│   ├── frontend/             # Next.js Admin Dashboard
│   └── zalo-mini-app/        # Zalo Mini App Client (React + Vite)
├── .agents/
│   └── skills/
│       └── figma-reader/     # AI Agent skill for Figma to React
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

### Chi tiết thư mục

- **`apps/backend`**: NestJS backend API sử dụng TypeScript, Node.js
  - Xử lý logic business, database, authentication
  - RESTful API endpoints cho frontend và Zalo Mini App

- **`apps/frontend`**: Ứng dụng Next.js (Admin Dashboard / Web Portal)
  - Quản trị viên quản lý sản phẩm, đơn hàng, người dùng
  - Dashboard thống kê và analytics

- **`apps/zalo-mini-app`**: Zalo Mini App Client chạy trực tiếp trên ứng dụng Zalo
  - React + Vite + ZMP SDK
  - Trải nghiệm mua sắm mobile-first
  - Tích hợp thanh toán Zalo Pay

- **`.agents/skills/figma-reader`**: Skill AI Agent giúp đọc và chuyển đổi Figma UI sang React Components

## 🚀 Công nghệ sử dụng

### Zalo Mini App Client
- **React 18**: UI Framework
- **Vite**: Build tool
- **ZMP SDK**: Zalo Mini App Platform SDK
- **zmp-ui**: UI Component Library cho Zalo Mini App
- **TailwindCSS**: CSS Framework
- **Zustand**: State Management
- **React Hook Form**: Form Handling
- **Zod**: Schema Validation
- **react-pull-to-refresh**: Pull-to-refresh functionality

### Backend
- **NestJS**: Backend Framework
- **TypeScript**: Type-safe JavaScript
- **Prisma**: ORM cho Database
- **PostgreSQL**: Database
- **Zalo OAuth**: Authentication

### Frontend Admin
- **Next.js 14**: React Framework
- **TypeScript**: Type-safe JavaScript
- **TailwindCSS**: CSS Framework
- **shadcn/ui**: UI Components

## 📦 Cài đặt & Chạy ứng dụng

### Yêu cầu hệ thống
- **Node.js** (Phiên bản khuyến nghị: >= 18.x)
- **PNPM** (Cài đặt bằng cách chạy `npm install -g pnpm`)
- **PostgreSQL** (cho backend database)

### Cài đặt dependencies
Chạy lệnh sau tại thư mục gốc để tự động cài đặt dependencies cho toàn bộ các dự án con:
```bash
pnpm install
```

### Cấu hình Environment Variables

Tạo file `.env` trong thư mục `apps/backend`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/shopquiet"
ZALO_APP_ID="your_zalo_app_id"
ZALO_SECRET_KEY="your_zalo_secret_key"
JWT_SECRET="your_jwt_secret"
```

Tạo file `.env` trong thư mục `apps/zalo-mini-app`:
```env
VITE_API_BASE_URL="http://localhost:3000/api"
VITE_ZALO_APP_ID="your_zalo_app_id"
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

### Build cho Production
```bash
# Build tất cả
pnpm build

# Build từng phần
pnpm build:backend
pnpm build:frontend
pnpm build:zalo
```

## 🔧 Cách hoạt động của dự án

### Architecture Flow

```
User (Zalo App)
    ↓
Zalo Mini App Client (React + Vite)
    ↓ (API Calls)
Backend API (NestJS)
    ↓
Database (PostgreSQL)
```

### Chi tiết luồng hoạt động

1. **User Authentication**:
   - Người dùng mở Zalo Mini App từ Zalo
   - Zalo SDK lấy thông tin user từ Zalo
   - User được sync với backend qua API `/api/users/sync`

2. **Product Browsing**:
   - Mini App fetch products từ `/api/products`
   - Products được cache trong localStorage
   - Pagination để load thêm products khi scroll
   - Search với debounce để tối ưu performance

3. **Cart Management**:
   - Cart được lưu trong Zustand state
   - Sync với backend qua `/api/cart`
   - Cập nhật số lượng, kích thước sản phẩm

4. **Order Processing**:
   - User checkout từ cart
   - Tạo đơn hàng qua `/api/orders`
   - Thanh toán qua Zalo Pay
   - Cập nhật trạng thái đơn hàng

5. **Notifications**:
   - Backend push notifications về đơn hàng
   - Mini App poll notifications mỗi 30s
   - Hiển thị trong tab thông báo

6. **Pull-to-Refresh**:
   - User kéo xuống trên trang home
   - React-pull-to-refresh trigger refresh
   - Fetch lại products, banners, categories
   - Update UI với dữ liệu mới

### API Endpoints chính

- `POST /api/users/sync` - Sync user từ Zalo
- `GET /api/products` - Lấy danh sách sản phẩm
- `GET /api/categories` - Lấy danh mục
- `GET /api/banners` - Lấy banner
- `GET /api/cart` - Lấy giỏ hàng
- `POST /api/cart` - Thêm vào giỏ hàng
- `PUT /api/cart/:id` - Cập nhật giỏ hàng
- `DELETE /api/cart/:id` - Xóa khỏi giỏ hàng
- `GET /api/favorites` - Lấy sản phẩm yêu thích
- `POST /api/favorites` - Thêm vào yêu thích
- `DELETE /api/favorites/:id` - Xóa khỏi yêu thích
- `GET /api/orders` - Lấy đơn hàng
- `POST /api/orders` - Tạo đơn hàng
- `GET /api/notifications` - Lấy thông báo
- `GET /api/cms/settings` - Lấy cấu hình CMS
- `GET /api/cms/bootstrap` - Lấy dữ liệu bootstrap

## 🔒 Bảo mật

- `.env` files được exclude bằng `.gitignore`
- Không commit sensitive data (API keys, secrets)
- Sử dụng environment variables cho configuration
- JWT token cho authentication
- CORS configuration cho API

## 📝 Ghi chú

- Project sử dụng PNPM workspace cho monorepo management
- Zalo Mini App cần được đăng ký trên [Zalo Mini App Platform](https://mini.zalo.me/)
- Backend cần PostgreSQL database đang chạy
- Admin dashboard chỉ dành cho quản trị viên

## 👥 Contributors

- [huynhat1210](https://github.com/huynhat1210)

## 📄 License

MIT License
