import { NextRequest } from "next/server";
import { ZodError } from "zod";
import prisma from "@/lib/db";
import { ok, notFound, serverError, validationError } from "@/lib/api";
import { UpdateDriverSchema } from "@/lib/validators/driver.schema";

type RouteContext = { params: { id: string } };

// ── GET /api/drivers/[id] ─────────────────────────────────────────────────────
export async function GET(_: NextRequest, { params }: RouteContext) {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: params.id },
      include: {
        vehicle: { select: { id: true, plate: true, name: true, capacityKg: true, status: true } },
      },
    });
    if (!driver) return notFound("Không tìm thấy tài xế");
    return ok(driver);
  } catch (err) {
    return serverError("Lỗi khi lấy thông tin tài xế", err);
  }
}

// ── PUT /api/drivers/[id] ─────────────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const body   = await req.json();
    const parsed = UpdateDriverSchema.parse(body);

    // Nếu có vehicleId: gán driver cho xe này (và bỏ gán driver cũ nếu có)
    if (parsed.vehicleId !== undefined) {
      if (parsed.vehicleId !== null) {
        // Bỏ driverId cũ của xe này trước (nếu xe đã có tài xế khác)
        await prisma.vehicle.updateMany({
          where: { driverId: params.id },
          data:  { driverId: null },
        });
        // Gán tài xế mới vào xe
        await prisma.vehicle.update({
          where: { id: parsed.vehicleId },
          data:  { driverId: params.id },
        });
      } else {
        // vehicleId = null → bỏ gán khỏi tất cả xe
        await prisma.vehicle.updateMany({
          where: { driverId: params.id },
          data:  { driverId: null },
        });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.name      !== undefined) updateData.name      = parsed.name;
    if (parsed.phone     !== undefined) updateData.phone     = parsed.phone;
    if (parsed.licenseNo !== undefined) updateData.licenseNo = parsed.licenseNo;
    if (parsed.status    !== undefined) updateData.status    = parsed.status;

    const driver = await prisma.driver.update({
      where: { id: params.id },
      data:  updateData,
      include: {
        vehicle: { select: { id: true, plate: true, name: true, status: true } },
      },
    });

    return ok(driver);
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    return serverError("Lỗi khi cập nhật tài xế", err);
  }
}

// ── DELETE /api/drivers/[id] ──────────────────────────────────────────────────
export async function DELETE(_: NextRequest, { params }: RouteContext) {
  try {
    // Bỏ gán khỏi xe trước khi xóa
    await prisma.vehicle.updateMany({
      where: { driverId: params.id },
      data:  { driverId: null },
    });

    await prisma.driver.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (err) {
    return serverError("Lỗi khi xóa tài xế", err);
  }
}
