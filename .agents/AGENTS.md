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
2. **Module Pattern:** Tuân thủ cấu trúc thiết kế Module Pattern được quy định trong tài liệu dự án (`# PROMPT Áp dụng cấu trúc module patern.txt`).
3. **API Tunneling:** Backend thường chạy qua Ngrok (`https://*.ngrok-free.dev`) để kết nối với Zalo Mini App Sandbox/Production.

---


