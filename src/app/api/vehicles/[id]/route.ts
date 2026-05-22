import { NextRequest } from "next/server";
import { ZodError } from "zod";
import prisma from "@/lib/db";
import { ok, notFound, serverError, validationError } from "@/lib/api";
import { UpdateVehicleSchema } from "@/lib/validators/vehicle.schema";

type RouteContext = { params: { id: string } };

// ── GET /api/vehicles/[id] ────────────────────────────────────────────────────
export async function GET(_: NextRequest, { params }: RouteContext) {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      include: { driver: true },
    });
    if (!vehicle) return notFound("Không tìm thấy xe");
    return ok(vehicle);
  } catch (err) {
    return serverError("Lỗi khi lấy thông tin xe", err);
  }
}

// ── PUT /api/vehicles/[id] ────────────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const body = await req.json();
    const parsed = UpdateVehicleSchema.parse(body);

    // Chỉ update fields được gửi (partial update)
    const data: Record<string, unknown> = {};
    if (parsed.plate          !== undefined) data.plate          = parsed.plate;
    if (parsed.name           !== undefined) data.name           = parsed.name;
    if (parsed.capacityKg     !== undefined) data.capacityKg     = parsed.capacityKg;
    if (parsed.costPerKm      !== undefined) data.costPerKm      = parsed.costPerKm;
    if (parsed.emissionPerKm  !== undefined) data.emissionPerKm  = parsed.emissionPerKm;
    if (parsed.status         !== undefined) data.status         = parsed.status;
    if (parsed.driverId       !== undefined) data.driverId       = parsed.driverId;

    const vehicle = await prisma.vehicle.update({ where: { id: params.id }, data });
    return ok(vehicle);
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    return serverError("Lỗi khi cập nhật xe", err);
  }
}

// ── DELETE /api/vehicles/[id] ─────────────────────────────────────────────────
export async function DELETE(_: NextRequest, { params }: RouteContext) {
  try {
    await prisma.vehicle.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (err) {
    return serverError("Lỗi khi xóa xe", err);
  }
}
