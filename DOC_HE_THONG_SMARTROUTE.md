# TÀI LIỆU KỸ THUẬT VÀ KIẾN TRÚC HỆ THỐNG: SMARTROUTE
**Hệ thống Quản lý Đội xe và Tối ưu hóa Lộ trình Giao hàng Đa mục tiêu (Multi-Objective VRPTW)**

---

## MỤC LỤC
1. Tổng quan Dự án
2. Cấu trúc và Công nghệ (Cập nhật Kiến trúc Async)
3. Kiến trúc Phần mềm và Luồng Dữ liệu
4. Mô hình Dữ liệu (Database Schema)
5. Đặc tả Module và Chức năng Nghiệp vụ
6. Cốt lõi Trí tuệ Nhân tạo: Thuật toán NSGA-II (TypeScript)
7. Thiết kế Giao diện (UI/UX)
8. Đánh giá và Hướng phát triển

---

## 1. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)
Trong kỷ nguyên Thương mại điện tử, bài toán tối ưu hóa định tuyến xe (VRP) với ràng buộc sức chứa và thời gian (MO-CVRPTW) là vô cùng phức tạp (NP-Hard). SmartRoute giải quyết bài toán này với mục tiêu **kép**: 
1. Tối thiểu hóa Chi phí Vận hành (Quãng đường / Tiền xăng).
2. Tối thiểu hóa Lượng phát thải Môi trường (CO2).

---

## 2. CẤU TRÚC VÀ CÔNG NGHỆ (TECHNOLOGY STACK)
Hệ thống sử dụng các công nghệ hiện đại, tuân thủ nguyên tắc thiết kế phân tán với Background Worker:

* **Frontend (Trải nghiệm Người dùng):**
  * **Framework:** Next.js (App Router) với React Server Components.
  * **Styling:** Tailwind CSS (Dark Mode).
  * **Bản đồ:** Leaflet.js & OpenStreetMap.
  * **Biểu đồ:** Recharts.
  
* **Backend (API & CSDL):**
  * **Framework:** Next.js Route Handlers (Node.js).
  * **Xác thực:** NextAuth.js (Quản lý JWT Session & Phân quyền Role-based).
  * **ORM:** Prisma (Type-safe database client).
  * **Database:** Relational Database (PostgreSQL / SQLite).
  
* **Optimization Engine & Queue (Lõi AI Bất đồng bộ):**
  * **Message Queue:** BullMQ & IORedis (chạy trên Docker).
  * **Background Worker:** Một tiến trình Node.js độc lập (`npm run worker`) chuyên xử lý tính toán nặng.
  * **Ngôn ngữ lõi AI:** 100% TypeScript. Thuật toán NSGA-II được viết thuần túy bằng TypeScript không phụ thuộc Python, tận dụng V8 Engine JIT Compilation.

---

## 3. KIẾN TRÚC PHẦN MỀM (SOFTWARE ARCHITECTURE)
Hệ thống tuân thủ kiến trúc **Web Server - Message Queue - Background Worker**.

### 3.1. Luồng xử lý Tối ưu hóa (Asynchronous Data Flow)
1. **Trigger:** Người dùng bấm "Tối ưu". Frontend gọi API POST tới `/api/optimize`.
2. **Queueing:** API Next.js đóng gói dữ liệu (Đơn hàng, Xe tải) và đẩy một Job vào **BullMQ (Redis)**, sau đó trả về ngay ID của Job (Response Time < 50ms).
3. **Processing:** Tiến trình **Background Worker** bắt lấy Job từ Redis, tiến hành chạy thuật toán NSGA-II (tốn vài chục giây) chiếm dụng CPU của Worker (Web Server vẫn mượt mà).
4. **Progress Tracking:** Worker liên tục cập nhật `% tiến độ` lên Redis.
5. **SSE Stream:** Frontend mở một kết nối Server-Sent Events (`/api/optimize/stream`) để lắng nghe cập nhật từ Redis và vẽ Progress Bar cho người dùng xem theo thời gian thực.
6. **Completion:** Khi AI chạy xong, kết quả lộ trình được Worker lưu thẳng vào Database và đánh dấu Job hoàn thành.

---

## 4. MÔ HÌNH DỮ LIỆU (DATABASE SCHEMA)
Hệ thống sử dụng Prisma Schema với các Model cốt lõi:

1. **User:** `id`, `email`, `password`, `role` (ADMIN, MANAGER, DRIVER). Có liên kết 1-1 với `Driver`.
2. **Driver (Tài xế):** `id`, `userId` (Liên kết với User account), `name`, `phone`, `licenseNo`, `status`. Phục vụ quy trình quản lý nhân sự chuẩn ERP.
3. **Order (Đơn hàng):** `id`, `code`, `customerName`, `address`, `lat`, `lng`, `demandKg`, `timeWindowStart`, `timeWindowEnd`, `status`.
4. **Vehicle (Xe tải):** `id`, `plateNumber`, `capacityKg`, `fuelPer100km`, `co2PerKm`, `status`, `driverId` (FK tới Driver). Xe không có tài xế sẽ không được phép chạy tối ưu.
4. **RoutePlan (Kế hoạch / Phiên AI):** `id`, `createdAt`, `status` (DRAFT, READY, COMPLETED).
5. **Route (Tuyến của 1 xe):** Thuộc về 1 `RoutePlan` và 1 `Vehicle`. Chứa `totalDistance`, `totalCost`, `totalCo2`, `polyline`.
6. **RouteStop (Điểm dừng):** Chi tiết thứ tự `sequence`, ETA cho từng `Order` trên một `Route`.

---

## 5. ĐẶC TẢ MODULE VÀ CHỨC NĂNG NGHIỆP VỤ
- **Auth Module:** Quản lý truy cập bằng NextAuth. Cấu hình Middleware chặn quyền cứng theo Role (DRIVER chỉ truy cập `/my-routes`, chặn toàn bộ dashboard).
- **Ops Center (Dashboard):** Thống kê Real-time KPI dành riêng cho khối Quản lý (Admin/Manager).
- **Driver Management:** Quản lý vòng đời nhân sự chuẩn ERP. Áp dụng cơ chế **Atomic Transaction** trong Database để tạo và cấp phát tài khoản User + Driver Profile đồng thời; đảm bảo xóa sạch dữ liệu offboarding 100%.
- **Order Management:** Thêm thủ công, Import Excel, Export Excel/PDF. Cung cấp chức năng Smart Map Picker để ghim cờ lấy tọa độ thủ công.
- **Fleet Management:** Quản lý sức chở, định mức tiêu hao của xe và gắn tài xế vào từng xe.
- **Driver View (Chuyến của tôi):** Màn hình tối giản dành riêng cho tài xế xem các lệnh điều động cụ thể (Route Stops), theo dõi KPI cá nhân trong ngày.
- **Routing & Dispatch:** Xem trước (Preview) mạng nhện lộ trình nhiều màu sắc do AI vẽ.
- **Tracking:** Render xe di chuyển trên bản đồ mô phỏng.

---

## 6. CỐT LÕI AI: THUẬT TOÁN TIẾN HÓA NSGA-II (TYPESCRIPT)
Module tối ưu lộ trình chạy **NSGA-II (Non-dominated Sorting Genetic Algorithm II)**, giải quyết bài toán đa mục tiêu.

### 6.1. Chi tiết Thuật toán
- **Ràng buộc cứng:** Sức chứa xe (`capacityKg`), Khung giờ (`timeWindows`). Các vi phạm sẽ bị cộng dồn thành điểm `penalty` rất cao.
- **Mục tiêu 1 ($f_1$):** Cực tiểu hóa $\sum (Chi\_phí\_vận\_hành)$.
- **Mục tiêu 2 ($f_2$):** Cực tiểu hóa $\sum (Lượng\_CO2\_phát\_thải)$.
- **Tiến hóa (Evolution):**
  1. Khởi tạo quần thể (Population).
  2. Lai ghép (Order Crossover - OX).
  3. Đột biến (Swap Mutation).
  4. Xếp hạng Pareto (Fast Non-dominated Sort) và Tính khoảng cách đám đông (Crowding Distance).
  5. Vòng lặp liên tục cho đến khi Quần thể hội tụ. Kết quả là một tập hợp nghiệm (Pareto Front) cho phép người dùng chọn sự đánh đổi giữa Tiết kiệm Xăng và Bảo vệ Môi trường.

---

## 7. THIẾT KẾ GIAO DIỆN (UI/UX)
- Giao diện Responsive (tương thích PC & Tablet) sử dụng Tailwind CSS.
- **Dark Theme** chuẩn phần mềm doanh nghiệp SaaS (Màu xám than kết hợp Neon nổi bật).
- **Trải nghiệm Zero-Lag:** Việc tách AI ra Background Worker giúp UI/UX hoàn toàn không bị gián đoạn hay freeze trình duyệt trong quá trình tối ưu.

---

## 8. HƯỚNG PHÁT TRIỂN TƯƠNG LAI
1. **Live Traffic:** Tích hợp Google Maps Distance Matrix API.
2. **Mobile App:** Dành riêng cho Driver (Tài xế) để xác nhận đơn hàng thực tế bằng điện thoại.
3. **Machine Learning:** Phân tích dữ liệu lịch sử để dự đoán thời gian kẹt xe ở từng tuyến phố.
