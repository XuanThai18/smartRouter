import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// POST /api/optimize/complete — hoàn thành kế hoạch, cập nhật trạng thái
export async function POST(req: NextRequest) {
  const { planId } = await req.json();

  const plan = await prisma.routePlan.findUnique({
    where: { id: planId },
    include: {
      routes: {
        include: { stops: true }
      }
    }
  });

  if (!plan) return NextResponse.json({ error: "Không tìm thấy plan" }, { status: 404 });

  // Cập nhật Plan
  await prisma.routePlan.update({
    where: { id: planId },
    data: { status: "COMPLETED" },
  });

  const orderIds: string[] = [];
  const vehicleIds: string[] = [];

  for (const route of plan.routes) {
    if (route.stops.length > 0) {
      vehicleIds.push(route.vehicleId);
      route.stops.forEach(s => orderIds.push(s.orderId));
    }
  }

  // Cập nhật Orders -> DELIVERED
  if (orderIds.length > 0) {
    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { status: "DELIVERED" }
    });
    
    // Cập nhật RouteStops -> DELIVERED
    await prisma.routeStop.updateMany({
      where: { orderId: { in: orderIds } },
      data: { status: "DELIVERED" }
    });
  }

  // Cập nhật Vehicles -> AVAILABLE
  if (vehicleIds.length > 0) {
    await prisma.vehicle.updateMany({
      where: { id: { in: vehicleIds } },
      data: { status: "AVAILABLE" }
    });
  }

  return NextResponse.json({ ok: true });
}
