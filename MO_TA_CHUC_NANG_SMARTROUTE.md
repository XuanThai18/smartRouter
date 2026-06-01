# MÔ TẢ CHỨC NĂNG SẢN PHẨM SMARTROUTE
Tài liệu này liệt kê chi tiết các tính năng, màn hình và luồng thao tác trực tiếp trên giao diện của phần mềm SmartRoute.

---

## 1. Màn hình Trung tâm Điều hành (Dashboard / Ops Center)
**Vị trí:** Màn hình chính khi đăng nhập.
**Mục đích:** Cung cấp cái nhìn toàn cảnh về tình trạng hoạt động của hệ thống vận tải ngay trong thời gian thực.
**Chi tiết chức năng:**
- **Auto-Refresh:** Tự động tải lại và cập nhật dữ liệu mỗi 15 giây mà không cần F5.
- **KPI Cards (Các chỉ số nóng):**
  - **Đơn chờ phân công:** Đếm số lượng đơn hàng đang ở trạng thái `PENDING`.
  - **Xe khả dụng:** Hiển thị tổng số xe tải đang ở trạng thái `AVAILABLE`.
  - **Đơn đang giao:** Đếm số lượng đơn hàng đã được xếp lên xe và đi giao (`IN_TRANSIT`).
  - **Tỷ lệ hoàn thành:** Phần trăm đơn hàng đã giao thành công trong ngày.
- **Cảnh báo thông minh (Smart Alert):** Một thanh màu cam sẽ nhấp nháy trên màn hình nếu phát hiện có đơn hàng đang bị dồn ứ (chưa được phân xe), kèm theo nút bấm lối tắt chuyển ngay sang màn hình Tối ưu.
- **Biểu đồ trạng thái (Donut Chart):** Trực quan hóa tỷ lệ các đơn hàng: Chờ, Đã phân, Đang giao, Thành công, Thất bại trong ngày.
- **Danh sách Đơn mới nhất:** Bảng bên phải hiển thị nhanh các đơn hàng mới đổ về hệ thống, tự động bôi màu nổi bật cho các đơn chưa xử lý.

---

## 2. Quản lý Đơn hàng (Orders)
**Mục đích:** Nơi nhân viên nhập liệu hoặc tiếp nhận các đơn hàng cần đi giao.
**Chi tiết chức năng:**
- **Thêm đơn hàng loạt (Import Excel):** 
  - Nút `Import Excel` cho phép tải lên danh sách hàng trăm/hàng nghìn đơn hàng cùng lúc. 
  - Hệ thống tự động đọc file và gọi API tìm kiếm tọa độ (Geocoding) cho các địa chỉ trong file.
- **Thêm đơn thủ công:**
  - Form nhập thông tin: Tên khách hàng, Địa chỉ văn bản, Sức nặng hàng hóa (kg).
  - Nút **[Tìm tọa độ]**: Hệ thống sẽ tự động quét địa chỉ và ghim cờ lên bản đồ.
- **Bản đồ chọn tọa độ (Smart Map Picker):** 
  - Đây là tính năng dự phòng rất quan trọng. Nếu địa chỉ khách hàng cung cấp quá mập mờ (hoặc API bản đồ không tìm thấy), hệ thống sẽ mở ra một bản đồ tương tác.
  - Người dùng dùng chuột **kéo và thả lá cờ** đến đúng vị trí nhà khách hàng trên bản đồ, hệ thống sẽ chốt tọa độ Lat/Lng đó để lưu vào máy chủ.
- **Bảng dữ liệu đơn hàng:** Liệt kê toàn bộ đơn hàng, hiển thị mã đơn, khách hàng, số kg, và badge màu trạng thái. Tích hợp thanh tìm kiếm theo tên hoặc địa chỉ.

---

## 3. Tối ưu Lộ trình (Optimize)
**Mục đích:** Chạy thuật toán Trí tuệ Nhân tạo (NSGA-II) để giải bài toán gom đơn hàng lên xe sao cho tốn ít xăng nhất và xả ít CO2 nhất.
**Chi tiết chức năng:**
- **Kích hoạt Thuật toán:** Giao diện hiển thị nút "Khởi động AI Tối ưu". Khi bấm, hệ thống sẽ đóng gói toàn bộ đơn hàng `PENDING` và gửi xuống lõi xử lý AI.
- **Bảng Phân tích kết quả (Result Dashboard):**
  - Hiển thị so sánh giữa "Chạy thủ công" và "AI tối ưu".
  - Hiển thị lượng CO2 (kg) được tiết kiệm.
  - Hiển thị chi phí nhiên liệu giảm thiểu được.
- **Xem trước bản đồ mạng nhện (Route Preview):**
  - Hiển thị một bản đồ lớn với các đường nét đứt nhiều màu sắc.
  - Mỗi màu tương ứng với một chiếc xe, nối từ Kho (Depot) đến các nhà khách hàng. Giúp người điều phối nhìn bằng mắt thường xem lộ trình AI vạch ra có hợp lý không trước khi bấm "Chốt lộ trình".

---

## 4. Quản lý Chuyến đi & Điều phối (Dispatch)
**Mục đích:** Nơi xuất lệnh điều động xe rời bến sau khi đã chốt lộ trình từ màn Tối ưu.
**Chi tiết chức năng:**
- **Danh sách Chuyến (Routes):** Liệt kê các tuyến đường đã được tạo. Mỗi tuyến hiển thị: Xe nào phụ trách, Tổng quãng đường bao nhiêu km, chở bao nhiêu Kg hàng hóa.
- **Danh sách Điểm dừng (Stops):** Click vào mỗi chuyến sẽ hiện ra thứ tự các điểm dừng:
  - Khởi hành từ Depot (Kho).
  - Giao Khách hàng A -> Khách hàng B -> Khách hàng C.
  - Trở về Depot.
- Đóng vai trò như tờ Lệnh điều động (Manifest) đưa cho tài xế.

---

## 5. Giám sát Theo dõi (Tracking)
**Mục đích:** Theo dõi trực tiếp các xe tải đang chạy ngoài đường.
**Chi tiết chức năng:**
- **Bản đồ Live Tracking:** Hiển thị bản đồ giao diện nền tối (Dark mode) sang trọng.
- **Mô phỏng GPS (Simulation):** Các icon xe tải sẽ chạy di chuyển dọc theo các đường màu trên bản đồ. 
- Hệ thống tính toán độ trễ và vận tốc để xe di chuyển từ điểm giao hàng này sang điểm giao hàng tiếp theo, tự động cập nhật vị trí mà không cần người dùng thao tác.

---

## 6. Quản lý Đội xe (Fleet / Vehicles)
**Mục đích:** Quản lý tài sản là các xe tải chở hàng.
**Chi tiết chức năng:**
- Hiển thị danh sách xe với các thông số:
  - Biển số xe.
  - Tải trọng tối đa (Kg).
  - Định mức tiêu thụ nhiên liệu.
  - Trạng thái hiện tại: Sẵn sàng chạy (`AVAILABLE`), Đang chở hàng ngoài đường (`ON_ROUTE`), hay Đang sửa chữa (`MAINTENANCE`).
- Cho phép đổi trạng thái bảo trì nếu xe hỏng hóc, khi đó AI sẽ không phân đơn hàng cho xe này nữa.

---

## 7. Báo cáo & Phân tích (Reports)
**Mục đích:** Cung cấp biểu đồ cho cấp Quản lý để đánh giá hiệu suất.
**Chi tiết chức năng:**
- **Biểu đồ Tài chính & Môi trường:** Hiển thị đường xu hướng (Trend line) của chi phí vận hành và lượng khí thải CO2 qua các ngày.
- **Biểu đồ Đơn hàng:** Tổng hợp số liệu đơn hàng đã xử lý trong tuần/tháng.
- Các chỉ số nằm ở màn hình này mang tính chất lịch sử và phân tích (Analytics), tách biệt hoàn toàn với tính chất thời gian thực (Real-time) của màn hình Dashboard.
