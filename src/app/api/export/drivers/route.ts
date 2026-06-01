import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return new Response("Unauthorized", { status: 403 });
    }

    const drivers = await prisma.driver.findMany({
      include: {
        vehicle: true, // Include the assigned vehicle details
      },
      orderBy: { createdAt: "desc" },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SmartRoute ERP";
    const sheet = workbook.addWorksheet("Tài Xế");

    sheet.columns = [
      { header: "Mã Tài Xế", key: "id", width: 15 },
      { header: "Tên Tài Xế", key: "name", width: 25 },
      { header: "Số Điện Thoại", key: "phone", width: 20 },
      { header: "Trạng Thái", key: "status", width: 15 },
      { header: "Bằng Lái", key: "licenseType", width: 15 },
      { header: "Xe Được Gán (Biển Số)", key: "assignedVehicle", width: 25 },
    ];

    // Định dạng Header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { horizontal: "center" };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } };

    // Đổ dữ liệu
    for (const d of drivers) {
      sheet.addRow({
        id: d.id.slice(-6).toUpperCase(),
        name: d.name,
        phone: d.phone,
        status: d.status,
        licenseType: d.licenseNo || "-",
        assignedVehicle: d.vehicle && d.vehicle.length > 0 ? d.vehicle.map(v => v.plate).join(", ") : "Chưa có",
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="smartroute_drivers_${Date.now()}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("Lỗi export tài xế:", err);
    return new Response("Lỗi server", { status: 500 });
  }
}
