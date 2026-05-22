# SmartRoute ERP — Logistics Optimization Platform

Hệ thống ERP logistics tối ưu lộ trình giao hàng đa mục tiêu với NSGA-II.

## Tech Stack
- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL + Prisma ORM
- **Optimization:** NSGA-II (TypeScript port)
- **Maps:** Leaflet.js + OpenStreetMap
- **Charts:** Recharts
- **Geocoding:** Nominatim (OpenStreetMap, miễn phí)

## Cài đặt

### Yêu cầu
- Node.js >= 18
- PostgreSQL >= 14

### Bước 1: Cài dependencies
```bash
cd d:\CN1\SmartRoute
npm install
```

### Bước 2: Cấu hình database
Mở file `.env` và sửa:
```
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/smartroute"
```

### Bước 3: Tạo database
```bash
# Tạo DB trong PostgreSQL trước, sau đó:
npx prisma db push
npx prisma generate
```

### Bước 4: Seed dữ liệu mẫu
```bash
npx ts-node prisma/seed.ts
```

### Bước 5: Chạy ứng dụng
```bash
npm run dev
```

Mở http://localhost:3000 → tự redirect sang /dashboard

## Cấu trúc thư mục

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx   # Module 1: Dashboard
│   │   ├── orders/page.tsx      # Module 2: Đơn hàng
│   │   ├── fleet/page.tsx       # Module 3: Đội xe
│   │   ├── optimize/page.tsx    # Module 4: NSGA-II ⭐
│   │   ├── dispatch/page.tsx    # Module 5: Điều phối
│   │   ├── tracking/page.tsx    # Module 6: Theo dõi
│   │   └── reports/page.tsx     # Module 7: Báo cáo
│   └── api/
│       ├── dashboard/route.ts
│       ├── orders/route.ts
│       ├── vehicles/route.ts
│       └── optimize/route.ts    # Runs NSGA-II
├── lib/
│   ├── nsga2/engine.ts          # Core NSGA-II algorithm
│   ├── geocoding.ts             # Nominatim geocoder
│   └── db.ts                    # Prisma client
└── components/
    └── Sidebar.tsx
prisma/
├── schema.prisma
└── seed.ts
```

## Import đơn hàng từ Excel

File Excel cần có các cột:
| Tên khách | SĐT | Địa chỉ | Khối lượng (kg) | Giờ mở (phút) | Giờ đóng (phút) | Phục vụ (phút) |
|-----------|-----|---------|-----------------|---------------|-----------------|---------------|

Giờ mở/đóng tính bằng phút từ 00:00 (VD: 8h = 480, 12h = 720, 17h = 1020)

## Depot mặc định
Lat: 10.7769, Lng: 106.7009 (Trung tâm TP.HCM)
Có thể thay đổi trong trang Optimize.
# smartRouter
