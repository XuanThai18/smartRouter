import { NextRequest } from "next/server";
import { ZodError } from "zod";
import prisma from "@/lib/db";
import { ok, notFound, serverError, validationError } from "@/lib/api";
import { DispatchSchema } from "@/lib/validators/optimize.schema";

// ── POST /api/optimize/dispatch — chốt phương án, đổi plan sang DISPATCHED ───
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, selectedIdx } = DispatchSchema.parse(body);

    const plan = await prisma.routePlan.update({
      where: { id: planId },
      data:  { status: "DISPATCHED", selectedIdx },
      include: {
        routes: {
          include: {
            vehicle: true,
            stops: {
              include: { order: true },
              orderBy: { position: "asc" },
            },
          },
        },
      },
    });

    // Cập nhật trạng thái xe → ON_ROUTE (chỉ xe có stops thực tế)
    const activeVehicleIds = plan.routes
      .filter((r) => r.stops.length > 0)
      .map((r) => r.vehicleId);

    if (activeVehicleIds.length > 0) {
      await prisma.vehicle.updateMany({
        where: { id: { in: activeVehicleIds } },
        data:  { status: "ON_ROUTE" },
      });
    }

    return ok({ plan });
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    return serverError("Lỗi khi điều phối kế hoạch", err);
  }
}
