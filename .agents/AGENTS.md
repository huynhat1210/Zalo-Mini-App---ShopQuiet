# PROJECT CONTEXT & ARCHITECTURE GUIDANCE

> **Project Name:** Zalo Mini App E-Commerce Monorepo (`zalo-ecommerce-monorepo`)  
> **Type:** Enterprise Monorepo Architecture (pnpm workspaces)  
> **Last Updated:** 2026-07-23  

---

## 1. Project Overview & Architecture

Dự án là hệ sinh thái **Thương mại điện tử Zalo Mini App** triển khai dưới dạng **Monorepo** bằng `pnpm workspaces`.

### Monorepo Apps Structure (`/apps`):
1. **`zalo-mini-app`**: Ứng dụng Zalo Mini App khách hàng dùng mua hàng.
2. **`backend`**: API Server (Node.js/Express, ORM/Prisma/PostgreSQL DB).
3. **`cms` / `admin-cms`**: Trang quản trị CMS dành cho người bán / admin.
4. **`www`**: Trang giới thiệu hoặc Web Client.

---

## 2. Key Commands & Workflow

- **Khởi chạy đồng thời tất cả:** `pnpm dev`
- **Chạy Zalo Mini App:** `pnpm dev:zalo`
- **Chạy Backend API:** `pnpm dev:backend`
- **Chạy Admin CMS:** `pnpm dev:admin` / `pnpm dev:cms`
- **Chạy kèm Ngrok tunnel:** `pnpm dev:with-ngrok` (hoặc script ngrok `powershell -File ./scripts/ngrok/start-ngrok.ps1`)
- **Database (Prisma/PostgreSQL):** `pnpm db:generate`, `pnpm db:migrate:dev`, `pnpm db:seed`

---

## 3. Technology Stack

- **Monorepo Manager:** `pnpm` workspaces
- **Frontend / Mini App:** React, TypeScript, Zalo Mini App SDK (zmp-sdk)
- **Backend:** Node.js, Express, Prisma ORM, PostgreSQL
- **Dev Operations:** Ngrok Tunneling Scripts (PowerShell)

---

## 4. Work Rules & Best Practices

1. **Context Efficiency:** Khi bắt đầu phiên làm việc mới, đọc file này (`.agents/AGENTS.md`) để khôi phục toàn bộ bối cảnh dự án nhanh chóng mà không cần scan lại toàn bộ file nguồn.
2. **Icon Library Standard (BẮT BUỘC KHÔNG VIẾT TAY ICON):**
   - **CMS Admin (`apps/cms`)**: 100% sử dụng icon thư viện `lucide-react` (VD: `import { Megaphone, Plus, Trash2 } from 'lucide-react'`). Tuyệt đối không dùng thẻ `<svg>` tự viết hoặc emoji làm icon chính.
   - **Zalo Mini App (`apps/zalo-mini-app`)**: Sử dụng thư viện `@heroicons/react/24/outline`, `@heroicons/react/24/solid` hoặc `lucide-react`.
3. **Module Pattern Architecture Standard (CẤU TRÚC CHUẨN THỐNG NHẤT):**
   - **Backend (`apps/backend/src/modules/[module-name]`)**:
     - `[module-name].module.ts`
     - `[module-name].controller.ts`
     - `[module-name].service.ts`
     - `dto/create-[module-name].dto.ts` (DTO validation)
     - Đăng ký module trong `apps/backend/src/app.module.ts`.
   - **CMS Pages (`apps/cms/src/pages/[page-name]`)**:
     - `[page-name].tsx` (UI Component)
     - `[page-name].type.ts` (Props/Types)
     - Export trong `apps/cms/src/pages/index.ts`.
     - Đăng ký Lazy Route trong `App.tsx` & thêm Menu Sidebar trong `sidebar.component.tsx`.
   - **Mini App Pages (`apps/zalo-mini-app/src/pages/[page-name]`)**:
     - `[page-name].tsx` (UI Component)
     - `[page-name].type.ts` (Props/Types)
     - Export trong `apps/zalo-mini-app/src/pages/index.ts`.
4. **API Tunneling:** Backend thường chạy qua Ngrok (`https://*.ngrok-free.dev`) để kết nối với Zalo Mini App Sandbox/Production.

---
