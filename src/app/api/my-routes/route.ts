import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

/**
 * GET /api/my-routes
 * Chỉ dành cho DRIVER — trả về các Route được giao cho xe của tài xế này.
 * Sử dụng userId (FK chuẩn ERP) thay vì name matching để đảm bảo tính chính xác.
 */
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "DRIVER") {
    return NextResponse.json({ error: "Forbidden - chỉ dành cho tài xế" }, { status: 403 });
  }

  // Tìm hồ sơ Driver liên kết chính xác qua userId (ERP standard)
  const driver = await prisma.driver.findUnique({
    where: { userId: session.user.id },
    include: {
      vehicle: { select: { id: true, plate: true, name: true } },
    },
  });

  if (!driver) {
    return NextResponse.json({
      routes: [],
      message: "Tài khoản của bạn chưa được liên kết với hồ sơ tài xế. Vui lòng liên hệ quản lý.",
    });
  }

  const vehicleIds = driver.vehicle.map(v => v.id);
  if (vehicleIds.length === 0) {
    return NextResponse.json({
      routes: [],
      driverName: driver.name,
      message: "Bạn chưa được gán xe. Vui lòng liên hệ điều phối viên.",
    });
  }

  // Lấy các tuyến đường của ngày hôm nay
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const routes = await prisma.route.findMany({
    where: {
      vehicleId: { in: vehicleIds },
      plan: {
        date:   { gte: today, lt: tomorrow },
        status: { in: ["READY", "DISPATCHED", "COMPLETED"] },
      },
    },
    include: {
      vehicle: { select: { plate: true, name: true } },
      stops: {
        include: {
          order: {
            select: {
              id:           true,
              customerName: true,
              address:      true,
              phone:        true,
              demandKg:     true,
            },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  return NextResponse.json({
    driverName: driver.name,
    phone:      driver.phone,
    routes,
  });
}
