import * as XLSX from "xlsx";
import * as fs from "fs";

const data = [
  {
    "Tên khách": "Cửa hàng Bách Hóa Xanh",
    "ĐT": "0911223344",
    "Địa chỉ": "205 Nguyễn Trãi, Phường Nguyễn Cư Trinh, Quận 1",
    "Khối lượng (kg)": 40,
    "Giờ mở (phút)": 420, // 7:00 AM
    "Giờ đóng (phút)": 1020, // 5:00 PM
    "Phục vụ (phút)": 20
  },
  {
    "Tên khách": "Siêu thị Co.opmart",
    "ĐT": "0988776655",
    "Địa chỉ": "168 Nguyễn Đình Chiểu, Phường Võ Thị Sáu, Quận 3",
    "Khối lượng (kg)": 50,
    "Giờ mở (phút)": 480, // 8:00 AM
    "Giờ đóng (phút)": 1200, // 8:00 PM
    "Phục vụ (phút)": 30
  },
  {
    "Tên khách": "Nhà thuốc An Khang",
    "ĐT": "0909112233",
    "Địa chỉ": "89 Hai Bà Trưng, Phường Bến Nghé, Quận 1",
    "Khối lượng (kg)": 10,
    "Giờ mở (phút)": 480,
    "Giờ đóng (phút)": 960,
    "Phục vụ (phút)": 10
  },
  {
    "Tên khách": "Cửa hàng tiện lợi Circle K",
    "ĐT": "0933445566",
    "Địa chỉ": "45 Phạm Ngọc Thạch, Phường Võ Thị Sáu, Quận 3",
    "Khối lượng (kg)": 15,
    "Giờ mở (phút)": 0, // Mở cả ngày
    "Giờ đóng (phút)": 1440,
    "Phục vụ (phút)": 15
  },
  {
    "Tên khách": "Đại lý gạo chú Năm",
    "ĐT": "0977889900",
    "Địa chỉ": "345 Lê Văn Sỹ, Phường 13, Quận 3",
    "Khối lượng (kg)": 100,
    "Giờ mở (phút)": 420, // 7:00 AM
    "Giờ đóng (phút)": 720, // 12:00 PM (Chỉ nhận sáng)
    "Phục vụ (phút)": 25
  },
  {
    "Tên khách": "Quán cafe The Coffee House",
    "ĐT": "0966554433",
    "Địa chỉ": "120 Cách Mạng Tháng 8, Phường 7, Quận 3",
    "Khối lượng (kg)": 25,
    "Giờ mở (phút)": 420,
    "Giờ đóng (phút)": 600, // 10:00 AM
    "Phục vụ (phút)": 15
  },
  {
    "Tên khách": "Điện máy xanh",
    "ĐT": "0922334455",
    "Địa chỉ": "136 Nguyễn Thái Học, Phường Phạm Ngũ Lão, Quận 1",
    "Khối lượng (kg)": 150,
    "Giờ mở (phút)": 480,
    "Giờ đóng (phút)": 1260, // 9:00 PM
    "Phục vụ (phút)": 40
  }
];

const worksheet = XLSX.utils.json_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Đơn hàng");

const filePath = "d:/CN1/SmartRoute/Mau_Nhap_Don_Hang_Chuan.xlsx";
XLSX.writeFile(workbook, filePath);

console.log(`Đã tạo lại file Excel mẫu với dữ liệu mới tại: ${filePath}`);
