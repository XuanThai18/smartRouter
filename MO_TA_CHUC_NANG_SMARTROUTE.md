# MÔ TẢ CHỨC NĂNG SẢN PHẨM SMARTROUTE
Tài liệu này liệt kê chi tiết các tính năng, màn hình và luồng thao tác trực tiếp trên giao diện của phần mềm SmartRoute.

---

## 1. Xác thực và Phân quyền (Authentication & Authorization)
**Mục đích:** Bảo vệ hệ thống, đảm bảo chỉ nhân sự có thẩm quyền mới được truy cập dữ liệu.
**Chi tiết chức năng:**
- **Đăng nhập (Login):** Giao diện đăng nhập bảo mật, cấp phiên làm việc bằng JWT (JSON Web Token).
- **Phân quyền (RBAC - Role Based Access Control):**
  - `ADMIN`: Toàn quyền quản trị hệ thống, quản lý tài khoản và offboarding nhân sự.
  - `MANAGER` (Điều phối viên): Được quyền Thêm/Sửa/Xóa Đơn hàng, quản lý xe, tạo hồ sơ tài xế và chạy thuật toán AI.
  - `DRIVER` (Tài xế): Chỉ xem được lộ trình được phân công cho chính xe của mình tại màn hình riêng biệt (Chuyến của tôi).

---

## 2. Màn hình Trung tâm Điều hành (Dashboard / Ops Center)
**Vị trí:** Màn hình chính sau khi đăng nhập thành công.
**Mục đích:** Cung cấp cái nhìn toàn cảnh về tình trạng hoạt động của hệ thống vận tải ngay trong thời gian thực.
**Chi tiết chức năng:**
- **Auto-Refresh:** Tự động cập nhật dữ liệu liên tục không cần F5.
- **KPI Cards (Các chỉ số nóng):**
  - **Đơn chờ phân công:** Đếm số lượng đơn hàng đang ở trạng thái `PENDING`.
  - **Xe khả dụng:** Hiển thị tổng số xe tải đang ở trạng thái `AVAILABLE`.
  - **Đơn đang giao:** Đếm số lượng đơn hàng đã được xếp lên xe và đi giao (`IN_TRANSIT`).
  - **Tỷ lệ hoàn thành:** Phần trăm đơn hàng đã giao thành công trong ngày.
- **Cảnh báo thông minh (Smart Alert):** Banner màu cam nhấp nháy cảnh báo dồn ứ đơn hàng chưa phân tuyến, kèm nút chuyển ngay sang màn hình Tối ưu.
- **Biểu đồ trạng thái (Donut Chart / Bar Chart):** Trực quan hóa tỷ lệ các đơn hàng theo trạng thái trong ngày.
- **Danh sách Đơn mới nhất:** Bảng bên phải hiển thị nhanh các đơn mới đổ về, bôi màu nổi bật cho đơn chưa xử lý.

---

## 3. Quản lý Đơn hàng (Orders)
**Mục đích:** Nhập liệu và tiếp nhận đơn hàng cần giao.
**Chi tiết chức năng:**
- **Thêm đơn hàng loạt (Import Excel):** 
  - Upload danh sách hàng nghìn đơn hàng cùng lúc. 
  - Hệ thống tự động đọc file và gọi API tìm kiếm tọa độ (Geocoding).
- **Thêm đơn thủ công:**
  - Nhập Tên khách hàng, Địa chỉ, Khối lượng (kg), Khung giờ giao bắt buộc.
- **Bản đồ chọn tọa độ (Smart Map Picker):** 
  - Kéo và thả lá cờ (Marker) đến vị trí nhà khách hàng trên bản đồ tương tác để lấy tọa độ chuẩn xác (Fallback khi địa chỉ text không tìm ra tọa độ).
- **Xuất Báo cáo:** Nút Export dữ liệu đơn hàng ra file Excel / PDF để lưu trữ.

---

## 4. Tối ưu Lộ trình (Optimize / AI Engine)
**Mục đích:** Chạy thuật toán AI (NSGA-II) qua hàng đợi bất đồng bộ để phân đơn lên xe sao cho rẻ nhất và xả ít khí thải nhất.
**Chi tiết chức năng:**
- **Kích hoạt Thuật toán:** Giao diện hiển thị nút "Khởi động AI Tối ưu".
- **Tiến trình theo gian thực (Live Progress):** Sử dụng SSE (Server-Sent Events) hiện thanh Progress Bar chạy % quá trình thuật toán xử lý hàng đợi dưới Background Worker mà không làm đơ trình duyệt.
- **Bảng Phân tích kết quả đa mục tiêu:**
  - Hiển thị Pareto Front với các chỉ số: Chi phí vận chuyển tiết kiệm được ($), Lượng CO2 giảm thiểu (kg).
- **Xem trước bản đồ lộ trình (Route Preview):**
  - Hiển thị bản đồ lớn với các đường nét đứt (Polyline) nhiều màu sắc. Mỗi màu tương ứng một chiếc xe nối từ Kho (Depot) đến các điểm dừng.

---

## 5. Quản lý Chuyến đi & Điều phối (Dispatch)
**Mục đích:** Xuất lệnh điều động xe rời bến sau khi đã chốt phương án từ màn Tối ưu.
**Chi tiết chức năng:**
- **Danh sách Chuyến (Routes):** Xem tổng quãng đường, tổng khối lượng đã xếp lên từng xe.
- **Chi tiết Điểm dừng (Stops):** Thứ tự giao hàng chính xác từ Depot -> Khách A -> Khách B -> Depot.
- **Lệnh điều động (Manifest):** Giao diện như một bảng kê điện tử dành cho tài xế thực thi.

---

## 6. Giám sát Theo dõi (Tracking)
**Mục đích:** Theo dõi vị trí và tiến độ xe chạy ngoài đường.
**Chi tiết chức năng:**
- **Bản đồ Live Tracking:** Hiển thị trực quan theo thời gian thực.
- **Mô phỏng GPS (Simulation):** Icon xe tải chạy dọc theo tuyến đường, hệ thống tự động tính toán thời gian đến dự kiến (ETA).

---

## 7. Quản lý Đội xe (Fleet / Vehicles)
**Mục đích:** Quản lý tài sản (Xe tải) và điều kiện xuất bến.
**Chi tiết chức năng:**
- Thêm mới / Cập nhật xe với các thông số: Biển số, Tải trọng (Kg), Định mức nhiên liệu, Định mức CO2.
- **Gán Tài xế:** Liên kết xe với một tài xế cụ thể. (Xe không có tài xế sẽ bị AI loại khỏi thuật toán tối ưu - Chuẩn ERP).
- **Cập nhật trạng thái:** Chuyển xe sang trạng thái bảo trì (`MAINTENANCE`) để AI tự động loại xe này khỏi quá trình xếp đơn.

---

## 8. Quản lý Tài xế (Driver Management)
**Mục đích:** Quản lý hồ sơ nhân sự lái xe và phân quyền đăng nhập hệ thống chuẩn ERP.
**Chi tiết chức năng:**
- **Tạo hồ sơ:** Nhập thông tin Tên, Số điện thoại, Giấy phép lái xe.
- **Cấp tài khoản (Provisioning):** Hỗ trợ tạo đồng thời tài khoản đăng nhập (Email/Password) ngay khi tạo hồ sơ tài xế, đảm bảo liên kết dữ liệu chặt chẽ qua giao dịch nguyên tử (Atomic Transaction).
- **Offboarding:** Khi xóa tài xế (chỉ ADMIN thực hiện), hệ thống tự động thu hồi xe và xóa tài khoản đăng nhập đi kèm để đảm bảo an ninh.

---

## 9. Chuyến giao hàng của tôi (My Routes - Góc nhìn Tài xế)
**Mục đích:** Giao diện tối giản dành riêng cho tài xế xem lộ trình trong ngày của mình.
**Chi tiết chức năng:**
- **Tự động nhận diện:** Dựa vào tài khoản đăng nhập, hệ thống tự trích xuất chính xác xe đang lái và các tuyến đường được điều phối viên gán.
- **KPI Cá nhân:** Theo dõi tổng số điểm giao, số đơn đã giao, và tổng số km di chuyển trong ngày.
- **Chi tiết lộ trình:** Danh sách các trạm dừng (Stops) sắp xếp theo thứ tự tối ưu (Sequence), hiển thị thông tin khách hàng, số điện thoại (có thể bấm gọi), khối lượng hàng và Thời gian đến dự kiến (ETA).
- **Bảo mật:** Tài xế bị khóa cứng tại màn hình này, mọi hành vi cố tình truy cập vào Dashboard Quản lý đều bị Middleware chặn và chuyển hướng lại.
