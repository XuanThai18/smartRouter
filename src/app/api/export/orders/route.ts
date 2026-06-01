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

    const { searchParams } = req.nextUrl;
    const date = searchParams.get("date");
    const status = searchParams.get("status");

    // Lọc theo date và status nếu có
    const where: any = {};
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        where.date = {
          gte: new Date(d.setHours(0, 0, 0, 0)),
          lt: new Date(d.setHours(23, 59, 59, 999)),
        };
      }
    }
    if (status && status !== "ALL") {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SmartRoute ERP";
    const sheet = workbook.addWorksheet("Đơn Hàng");

    sheet.columns = [
      { header: "Mã Đơn", key: "code", width: 15 },
      { header: "Khách Hàng", key: "customerName", width: 25 },
      { header: "Điện Thoại", key: "phone", width: 15 },
      { header: "Địa Chỉ", key: "address", width: 40 },
      { header: "Trạng Thái", key: "status", width: 15 },
      { header: "Khối Lượng (kg)", key: "demandKg", width: 15 },
      { header: "Ngày Giao", key: "date", width: 15 },
      { header: "Thời Gian Mở", key: "twStart", width: 15 },
      { header: "Thời Gian Đóng", key: "twEnd", width: 15 },
      { header: "TG Phục Vụ (phút)", key: "serviceMin", width: 20 },
      { header: "Tọa độ Lat", key: "lat", width: 15 },
      { header: "Tọa độ Lng", key: "lng", width: 15 },
    ];

    // Định dạng Header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { horizontal: "center" };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } };

    // Đổ dữ liệu
    for (const o of orders) {
      sheet.addRow({
        code: o.id.slice(-6).toUpperCase(),
        customerName: o.customerName,
        phone: o.phone || "-",
        address: o.address,
        status: o.status,
        demandKg: o.demandKg,
        date: o.date.toISOString().split("T")[0],
        twStart: `${Math.floor(o.twStart / 60).toString().padStart(2, "0")}:${(o.twStart % 60).toString().padStart(2, "0")}`,
        twEnd: `${Math.floor(o.twEnd / 60).toString().padStart(2, "0")}:${(o.twEnd % 60).toString().padStart(2, "0")}`,
        serviceMin: o.serviceMin,
        lat: o.lat,
        lng: o.lng,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="smartroute_orders_${Date.now()}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("Lỗi export đơn hàng:", err);
    return new Response("Lỗi server", { status: 500 });
  }
}
