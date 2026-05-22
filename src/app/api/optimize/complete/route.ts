import { NextRequest } from "next/server";
import { ZodError } from "zod";
import prisma from "@/lib/db";
import { ok, notFound, serverError, validationError } from "@/lib/api";
import { CompleteSchema } from "@/lib/validators/optimize.schema";

// ── POST /api/optimize/complete — hoàn thành kế hoạch ────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId } = CompleteSchema.parse(body);

    const plan = await prisma.routePlan.findUnique({
      where: { id: planId },
      include: { routes: { include: { stops: true } } },
    });

    if (!plan) return notFound("Không tìm thấy kế hoạch");

    // Cập nhật Plan → COMPLETED
    await prisma.routePlan.update({
      where: { id: planId },
      data:  { status: "COMPLETED" },
    });

    // Gom orderIds và vehicleIds từ routes có stops
    const orderIds: string[]   = [];
    const vehicleIds: string[] = [];

    for (const route of plan.routes) {
      if (route.stops.length > 0) {
        vehicleIds.push(route.vehicleId);
        route.stops.forEach((s) => orderIds.push(s.orderId));
      }
    }

    // Batch update — dùng updateMany thay vì loop
    if (orderIds.length > 0) {
      await prisma.order.updateMany({
        where: { id: { in: orderIds } },
        data:  { status: "DELIVERED" },
      });
      await prisma.routeStop.updateMany({
        where: { orderId: { in: orderIds } },
        data:  { status: "DELIVERED" },
      });
    }

    if (vehicleIds.length > 0) {
      await prisma.vehicle.updateMany({
        where: { id: { in: vehicleIds } },
        data:  { status: "AVAILABLE" },
      });
    }

    return ok({
      completed: true,
      ordersDelivered:  orderIds.length,
      vehiclesReleased: vehicleIds.length,
    });
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    return serverError("Lỗi khi hoàn thành kế hoạch", err);
  }
}
