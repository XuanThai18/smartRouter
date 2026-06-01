# SmartRoute ERP — Enterprise Logistics Optimization Platform

Hệ thống ERP Logistics cấp doanh nghiệp (Enterprise-grade) giúp tối ưu hóa lộ trình giao hàng đa mục tiêu (Multi-Objective Vehicle Routing Problem - VRPTW) với thuật toán **NSGA-II**. 

Phiên bản mới nhất đã được tái cấu trúc kiến trúc (Micro-architecture) nhằm tách biệt các tác vụ nặng (Background Processing) ra khỏi Web Server chính, đảm bảo trải nghiệm người dùng (UX) luôn mượt mà và hệ thống không bị nghẽn (Timeout).

---

## 🌟 Tính năng nổi bật

- **Tối Ưu Đường Đi (NSGA-II):** Thuật toán Di truyền Đa mục tiêu tối ưu đồng thời Tổng chi phí, Lượng CO2 phát thải, và Khối lượng vận chuyển.
- **Background Processing & Queue:** Sử dụng **Redis** & **BullMQ** để xử lý thuật toán nặng ngầm bên dưới. Không gây block Main Thread.
- **Real-time SSE Progress:** Giao diện theo dõi quá trình chạy thuật toán trực tiếp từng %, giúp người dùng biết được NSGA-II đang ở thế hệ (Generation) thứ mấy.
- **Export & Báo Cáo:** Xuất dữ liệu (Đơn hàng, Tài xế, Lộ trình) ra **Excel (.xlsx)** bằng `exceljs` và báo cáo phân tích ra **PDF** bằng `pdfkit`.
- **Hệ Thống UX Hiện Đại:** 
  - Toasts thông báo mượt mà bằng thư viện `Sonner`.
  - Cơ chế **Error Boundaries** của Next.js ngăn chặn trang web bị văng trắng màn hình khi có lỗi.
- **Audit Log:** Ghi vết mọi hành động của người dùng (Thêm, Sửa, Xóa Đơn hàng / Đội xe, v.v.).

---

## 🛠 Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend API:** Next.js Route Handlers
- **Background Worker:** Node.js Worker (BullMQ + tsx)
- **Database:** PostgreSQL + Prisma ORM
- **Message Queue:** Redis 7 (chạy qua Docker)
- **Maps:** Leaflet.js + OpenStreetMap (Nominatim Geocoding)
- **Authentication:** NextAuth.js (Credentials Provider + JWT)

---

## 🚀 Hướng Dẫn Cài Đặt & Vận Hành

### Yêu cầu hệ thống
- Node.js >= 18
- Docker Desktop (để chạy Redis và PostgreSQL nếu cần)

### Bước 1: Khởi động Redis
Hệ thống bắt buộc phải có Redis để làm hàng đợi (Queue) cho Background Worker.
```bash
# Mở thư mục chứa dự án
cd d:\CN1\SmartRoute

# Bật Docker Compose để khởi chạy Redis dưới nền (cổng 6379)
docker-compose up -d
```

### Bước 2: Cài đặt Dependencies
```bash
npm install
```

### Bước 3: Cấu hình Database
Đảm bảo bạn đã có sẵn PostgreSQL. Sửa file `.env` tại thư mục gốc:
```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/smartroute"
NEXTAUTH_SECRET="your-secret-key-123"
NEXTAUTH_URL="http://localhost:3000"
REDIS_URL="redis://localhost:6379"
```

### Bước 4: Tạo Database & Dữ liệu mẫu (Seed)
```bash
# Đồng bộ Schema xuống Database
npx prisma db push

# Chạy Seed để tạo tài khoản Admin và dữ liệu Đội xe/Đơn hàng mẫu
npx ts-node prisma/seed.ts
```
*(Lưu ý: Tùy hệ điều hành, bạn có thể chạy `npm run db:seed` nếu đã cấu hình script trong package.json)*

---

### Bước 5: Chạy Ứng Dụng (Cần 2 Terminal)

Kiến trúc mới chia hệ thống làm 2 mảnh ghép độc lập:
1. **Web Server:** Chuyên phục vụ giao diện và API nhẹ.
2. **Background Worker:** Chuyên tính toán trí tuệ nhân tạo (NSGA-II).

**Terminal 1 — Khởi động Web Server:**
```bash
npm run dev
```

**Terminal 2 — Khởi động Background Worker:**
```bash
npm run worker
```

> [!IMPORTANT]
> Nếu bạn không chạy `npm run worker`, khi bạn bấm "Bắt đầu tối ưu" trên giao diện, hệ thống sẽ mãi mãi ở trạng thái chờ vì không có Worker nào tiếp nhận việc tính toán cả!

---

## 📁 Cấu trúc thư mục cốt lõi

```text
src/
├── app/
│   ├── (dashboard)/             # Các module giao diện (Orders, Fleet, Optimize, Reports,...)
│   ├── api/                     # Next.js API Routes (Orders, Auth, Export, Export SSE)
│   ├── error.tsx                # Global Error Boundary
│   └── layout.tsx               # Root Layout chứa Sonner Toaster
├── components/                  # Giao diện tái sử dụng (Toast, Modals)
├── lib/
│   ├── nsga2/                   # Thuật toán tối ưu NSGA-II
│   ├── db.ts                    # Prisma Client singleton
│   ├── redis.ts                 # Cấu hình Redis client
│   ├── queue.ts                 # Định nghĩa BullMQ Producer (đẩy job vào queue)
│   ├── worker.ts                # Định nghĩa BullMQ Processor (chạy NSGA-II)
│   ├── audit.ts                 # Hàm helper ghi Audit Log
│   └── auth.ts                  # Cấu hình NextAuth
└── scripts/
    └── startWorker.ts           # Điểm khởi đầu để chạy Background Worker
```

## 📝 Thông tin tài khoản mặc định
Khi chạy xong `prisma/seed.ts`, hệ thống sẽ có tài khoản sau:
- **Email:** admin@smartroute.vn
- **Password:** admin123
- **Role:** ADMIN

## 🗺 Depot mặc định (VRP)
- **Tọa độ:** Lat: `10.7769`, Lng: `106.7009` (Trung tâm TP.HCM)
- Có thể thay đổi trực tiếp bằng cách click trên Bản đồ ở module **Optimize**.
