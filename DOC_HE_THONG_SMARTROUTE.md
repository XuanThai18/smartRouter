# TÀI LIỆU KỸ THUẬT VÀ KIẾN TRÚC HỆ THỐNG: SMARTROUTE
**Hệ thống Quản lý Đội xe và Tối ưu hóa Lộ trình Giao hàng Đa mục tiêu (Multi-Objective VRPTW)**

---

## MỤC LỤC
1. Tổng quan Dự án
2. Cấu trúc và Công nghệ 
3. Kiến trúc Phần mềm
4. Mô hình Dữ liệu (Database Schema)
5. Đặc tả Module và Chức năng Nghiệp vụ
6. Cốt lõi Trí tuệ Nhân tạo: Thuật toán NSGA-II
7. Thiết kế Giao diện (UI/UX)
8. Đánh giá và Hướng phát triển

---

## 1. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)
### 1.1. Đặt vấn đề
Trong kỷ nguyên Thương mại điện tử và Logistics hiện đại, chi phí vận tải chiếm tỷ trọng lớn trong cơ cấu giá thành sản phẩm. Bài toán tối ưu hóa định tuyến xe (Vehicle Routing Problem - VRP) đặc biệt là khi có thêm ràng buộc về sức chứa (Capacitated) và khung thời gian giao nhận (Time Windows) trở thành một bài toán tối ưu tổ hợp cực kỳ phức tạp (NP-Hard).
Thêm vào đó, áp lực về "Logistics Xanh" buộc các doanh nghiệp không chỉ quan tâm đến bài toán "Chi phí" mà còn phải giải bài toán "Môi trường" (giảm phát thải CO2).

### 1.2. Giải pháp đề xuất: SmartRoute
SmartRoute là nền tảng quản trị Logistics toàn diện được xây dựng nhằm giải quyết bài toán trên. Hệ thống tự động phân bổ hàng trăm đơn hàng cho một đội xe với mục tiêu **kép**: 
1. Tối thiểu hóa Tổng quãng đường (liên quan trực tiếp tới chi phí xăng dầu, khấu hao).
2. Tối thiểu hóa Lượng phát thải CO2.

---

## 2. CẤU TRÚC VÀ CÔNG NGHỆ (TECHNOLOGY STACK)
Hệ thống sử dụng các công nghệ hiện đại nhất, tuân thủ nguyên tắc thiết kế phân tán:

* **Frontend (Giao diện người dùng & Nghiệp vụ Client):**
  * **Framework:** Next.js (React) kiến trúc App Router - Tối ưu hóa SEO và Server-Side Rendering (SSR).
  * **Styling:** Tailwind CSS - Cung cấp tiện ích định dạng nhanh, tùy biến sâu sắc Dark Mode.
  * **Mapping:** Leaflet.js & OpenStreetMap - Render bản đồ số, vẽ đa giác (polygon), vẽ đường đi (polyline) thời gian thực.
  * **Visualization:** Recharts - Vẽ biểu đồ trực quan hóa dữ liệu (PieChart, AreaChart).
  * **Icons:** Lucide React.
  
* **Backend (Máy chủ xử lý API & CSDL):**
  * **Framework:** Next.js Route Handlers (Node.js).
  * **ORM (Object-Relational Mapping):** Prisma - Quản lý schema database, migration và query type-safe.
  * **Database:** Relational Database (SQLite/PostgreSQL) lưu trữ cấu trúc.
  * **External Services:** Photon API (từ Komoot) sử dụng dữ liệu OpenStreetMap để Geocoding (chuyển đổi địa chỉ văn bản thành Tọa độ GPS).
  
* **Optimization Engine (Lõi xử lý thuật toán tối ưu):**
  * **Ngôn ngữ:** Python 3.
  * **Thư viện AI:** DEAP (Distributed Evolutionary Algorithms in Python) để chạy thuật toán Di truyền.
  * **Thư viện tính toán:** NumPy, Pandas, SciPy.
  * **Giao tiếp:** Tích hợp gọi chéo (Cross-process / HTTP REST) từ Node.js sang Python.

---

## 3. KIẾN TRÚC PHẦN MỀM (SOFTWARE ARCHITECTURE)
Hệ thống tuân thủ kiến trúc **Client-Server** kết hợp **Micro-services Lite** (tách biệt Core Backend và AI Engine).

### 3.1. Luồng xử lý dữ liệu (Data Flow)
1. **Thu thập dữ liệu (Ingestion):** Người dùng (Dispatcher) tải lên file Excel đơn hàng hoặc tạo thủ công.
2. **Tiền xử lý & Nội suy tọa độ (Geocoding pipeline):** Dữ liệu dạng chữ được gửi tới Photon API. Nếu API thất bại (do rate-limit hoặc sai địa chỉ), hệ thống kích hoạt cơ chế Fallback nội bộ: Cấp phát tọa độ vệ tinh xung quanh khu vực Depot, hoặc yêu cầu người dùng ghim tay (Map Picker) để đảm bảo không thất thoát đơn hàng.
3. **Đóng gói (Payload generation):** Core Backend lọc các đơn hàng `PENDING` và danh sách xe `AVAILABLE`, tính toán ma trận khoảng cách (Distance Matrix) và gửi payload JSON sang Python Engine.
4. **Tối ưu hóa (Optimization):** Python nhận payload, chạy thuật toán NSGA-II trong không gian tìm kiếm đa chiều. Output là tập nghiệm Pareto, hệ thống tự động chọn một nghiệm tối ưu nhất.
5. **Gán tuyến (Dispatching):** Cập nhật CSDL: Đổi trạng thái đơn thành `ASSIGNED`, xe thành `ON_ROUTE`, lưu các điểm dừng (Stops) vào Database.
6. **Mô phỏng (Simulation):** Frontend định kỳ poll trạng thái, render chuyển động của xe trên bản đồ bằng thuật toán nội suy khoảng cách tuyến tính giữa các tọa độ GPS.

---

## 4. MÔ HÌNH DỮ LIỆU (DATABASE SCHEMA)
Hệ thống được thiết kế với các thực thể cốt lõi sau (thiết kế qua Prisma Schema):

1. **Order (Đơn hàng):**
   - `id`, `code` (Mã đơn).
   - `customerName`, `address` (Vị trí giao hàng).
   - `lat`, `lng` (Tọa độ địa lý chuẩn xác).
   - `demandKg` (Tải trọng hàng hóa).
   - `timeWindowStart`, `timeWindowEnd` (Khung giờ bắt buộc phải giao).
   - `status`: Khởi tạo (`PENDING`) -> Phân công (`ASSIGNED`) -> Đang giao (`IN_TRANSIT`) -> Thành công (`DELIVERED`) / Thất bại (`FAILED`).

2. **Vehicle (Xe tải):**
   - `id`, `plateNumber` (Biển số).
   - `capacityKg` (Sức chứa tối đa).
   - `fuelPer100km`, `co2PerKm` (Chỉ số Môi trường / Nhiên liệu).
   - `status`: `AVAILABLE` (Sẵn sàng), `ON_ROUTE` (Đang chạy), `MAINTENANCE` (Bảo dưỡng).

3. **Route (Tuyến đường):**
   - Gắn kết 1 Vehicle với N Order.
   - Lưu trữ: `totalDistance`, `totalCost`, `totalCo2`.
   - Lưu lộ trình Polyline (Chuỗi tọa độ JSON để vẽ map).

4. **RouteStop (Điểm dừng):**
   - Quan hệ 1-N từ Route. Xác định thứ tự giao hàng (Sequence).
   - Chứa tọa độ và thời gian dự kiến đến (ETA).

---

## 5. ĐẶC TẢ MODULE VÀ CHỨC NĂNG NGHIỆP VỤ

### 5.1. Module 1: Ops Center (Trung tâm Điều hành - Dashboard)
- **Mục đích:** Là trái tim của hệ thống vận hành. Giúp Điều phối viên theo dõi "Sức khỏe" của toàn bộ hệ thống ngay trong thời gian thực (Real-time).
- **Tính năng:**
  - Auto-refresh dữ liệu 15 giây/lần.
  - KPI Cards: Số đơn chờ phân công, Số xe đang rảnh, Số đơn đang trên đường giao, Tỷ lệ hoàn thành trong ngày (Delivery Success Rate).
  - Biểu đồ phân bổ trạng thái dạng Donut Chart trực quan.
  - Hệ thống Cảnh báo thông minh (Smart Alert): Banner màu cam nhấp nháy tự động xuất hiện khi có đơn hàng ùn ứ chưa được xếp xe, kèm nút kích hoạt "Tối ưu ngay".

### 5.2. Module 2: Order Management (Quản lý đơn & Tìm tọa độ)
- **Mục đích:** Số hóa đầu vào của Logistics.
- **Tính năng:**
  - **Batch Import:** Đọc file Excel đa luồng, hỗ trợ lên tới hàng ngàn đơn.
  - **Smart Map Picker:** Với các địa chỉ mà AI/API không thể dịch ra tọa độ, hệ thống cung cấp bản đồ Leaflet tích hợp ngay trong form. Người dùng chỉ việc kéo thả cờ (Marker) ghim đúng vị trí nhà khách hàng. Hệ thống tự động dịch ngược tọa độ (Lat/Lng) vào form.

### 5.3. Module 3: Fleet Management (Quản lý đội xe)
- **Mục đích:** Quản lý tài sản (Assets).
- **Tính năng:**
  - Khai báo tải trọng, định mức tiêu thụ nhiên liệu.
  - Bật/tắt trạng thái bảo trì xe.
  - Hiển thị danh sách xe dưới dạng Data Table chuẩn.

### 5.4. Module 4: Routing & Dispatch (Tối ưu & Điều phối)
- **Mục đích:** Module lõi tạo ra lợi nhuận cho doanh nghiệp.
- **Tính năng:**
  - Giao diện 1 click "Chạy thuật toán".
  - Quản lý các phiên tối ưu hóa. Bảng kết quả so sánh chi tiết quãng đường, chi phí tiết kiệm được so với việc điều phối chạy tay (Baseline).
  - Bản đồ hiển thị trước (Preview) đường đi của các xe dưới dạng mạng nhện nhiều màu sắc để người dùng duyệt trước khi xuất bến.

### 5.5. Module 5: GPS Tracking (Theo dõi Thời gian thực)
- **Mục đích:** Giám sát tiến độ giao hàng của tài xế.
- **Tính năng:**
  - Render Polyline (đường line) dọc theo các điểm giao hàng trên nền bản đồ Dark mode.
  - Sử dụng thuật toán Timer / Interpolation trên trình duyệt để di chuyển icon chiếc xe tải từ điểm A sang điểm B dựa trên tiến độ (Progress %), mô phỏng chính xác hệ thống GPS.

### 5.6. Module 6: Analytics Reports (Báo cáo Phân tích)
- **Mục đích:** Dành cho cấp Quản lý (Management Level) nhìn nhận hiệu quả thuật toán.
- **Tính năng:**
  - Biểu đồ AreaChart thống kê luồng đơn hàng 7 ngày.
  - Các thống kê lũy kế: Tiết kiệm CO2, Giảm thiểu chi phí ($).

---

## 6. CỐT LÕI AI: THUẬT TOÁN TIẾN HÓA ĐA MỤC TIÊU (NSGA-II)
Module tối ưu lộ trình của SmartRoute không sử dụng thuật toán tuần tự (Greedy, Dijkstra) thông thường vì chúng vướng phải "Bẫy tối ưu cục bộ" (Local Optima). Thay vào đó, **NSGA-II (Non-dominated Sorting Genetic Algorithm II)** được sử dụng.

### 6.1. Bài toán
Đây là bài toán **Multi-Objective Capacitated Vehicle Routing Problem with Time Windows (MO-CVRPTW)**.
- **Ràng buộc cứng:** Tải trọng xe không được vượt quá `capacityKg`. Phải giao hàng trong khung giờ `[start, end]`.
- **Mục tiêu 1 ($f_1$):** Cực tiểu hóa $\sum (Khoảng\_cách * Đơn\_giá\_xăng)$.
- **Mục tiêu 2 ($f_2$):** Cực tiểu hóa $\sum (Khoảng\_cách * Hệ\_số\_phát\_thải\_CO2)$.

### 6.2. Mã hóa Nhiễm sắc thể (Chromosome Encoding)
Mỗi phương án phân xe (Solution) được biểu diễn bằng 1 mảng số nguyên. Ví dụ: `[1, 5, 3, 0, 2, 4]` (0 là dấu phân cách giữa các xe).
- Tuyến 1: Depot -> Khách 1 -> Khách 5 -> Khách 3 -> Depot.
- Tuyến 2: Depot -> Khách 2 -> Khách 4 -> Depot.

### 6.3. Tiến hóa sinh học mô phỏng
1. **Khởi tạo Quần thể (Population):** Tạo ngẫu nhiên 100 - 500 cá thể (phương án phân xe).
2. **Lai ghép (Crossover):** Order Crossover (OX) - tráo đổi một phần lộ trình giữa 2 cá thể để tạo ra con lai mang đặc tính tốt của cả cha lẫn mẹ.
3. **Đột biến (Mutation):** Swap Mutation - Đổi chỗ ngẫu nhiên 2 đơn hàng để tránh quần thể bị thoái hóa.
4. **Phân loại không bị trội (Non-dominated Sorting):** Xếp hạng các cá thể. Những cá thể vừa rẻ vừa ít CO2 sẽ được lên Rank 1 (Mặt trận Pareto).
5. **Khoảng cách đám đông (Crowding Distance):** Lọc bỏ các cá thể giống nhau để duy trì sự đa dạng sinh học trong thuật toán.
6. **Tiến hóa (Generations):** Chạy lặp lại 100-300 vòng đời. Sau vòng cuối cùng, trả về phương án tốt nhất trên mặt trận Pareto.

---

## 7. THIẾT KẾ GIAO DIỆN (UI/UX)
Hệ thống lấy cảm hứng từ các phần mềm SaaS hiện đại (như Vercel, Linear):
- **Phối màu (Color Palette):** Nền Đen xám (`hsl(220 14% 8%)`) kết hợp với các dải màu điểm nhấn Neon (Xanh dương, Cam, Xanh lục).
- **Thành phần (Components):** 
  - Glassmorphism: Lớp phủ bản đồ mờ ảo (`backdrop-filter: blur()`).
  - Cards: Sử dụng đường viền mỏng 1px màu xám `hsl(220 14% 19%)` để tạo chiều sâu mà không dùng Shadow sặc sỡ.
- **Tương tác:** CSS Animations tinh tế (`fade-up`, `pulse-ring` cho cảnh báo, smooth transitions cho hover).

---

## 8. ĐÁNH GIÁ VÀ HƯỚNG PHÁT TRIỂN TƯƠNG LAI
### 8.1. Đánh giá hệ thống hiện tại
- **Hiệu năng:** Backend đáp ứng tải tốt nhờ tách rời AI Engine. Frontend tải cực mượt nhờ Server Components của Next.js.
- **Độ chính xác:** Geocoding kết hợp Map Picker tay giải quyết được 100% case lạc đường. NSGA-II đảm bảo tiết kiệm chi phí ổn định so với cách làm thủ công.

### 8.2. Hướng phát triển (Future Works)
1. **Tích hợp OSRM / Google Maps Distance Matrix API:** Thay vì dùng khoảng cách đường chim bay (Haversine), nâng cấp dùng API đường bộ thực tế (tránh sông hồ, đường một chiều) để có kết quả chính xác hơn.
2. **Traffic Prediction:** Kết hợp API dự báo kẹt xe để né các khung giờ cao điểm.
3. **Mobile App cho Tài xế:** Làm app điện thoại để tài xế nhận chuyến, cập nhật trạng thái đơn qua ứng dụng.
4. **AI Cấp cao:** Đưa Học máy (Machine Learning) vào dự đoán tỷ lệ hủy đơn hoặc thời gian bốc dỡ hàng tại điểm dừng.
