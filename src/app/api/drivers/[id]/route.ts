import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { ok, notFound, serverError, validationError, forbidden } from "@/lib/api";
import { UpdateDriverSchema } from "@/lib/validators/driver.schema";

type RouteContext = { params: { id: string } };

// ── GET /api/drivers/[id] ─────────────────────────────────────────────────────
export async function GET(_: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return forbidden("Yêu cầu quyền Admin hoặc Manager");
  }

  try {
    const driver = await prisma.driver.findUnique({
      where:   { id: params.id },
      include: {
        vehicle: { select: { id: true, plate: true, name: true, capacityKg: true, status: true } },
        user:    { select: { id: true, email: true, createdAt: true } },
      },
    });
    if (!driver) return notFound("Không tìm thấy tài xế");
    return ok(driver);
  } catch (err) {
    return serverError("Lỗi khi lấy thông tin tài xế", err);
  }
}

// ── PUT /api/drivers/[id] ─────────────────────────────────────────────────────
/**
 * Cập nhật thông tin Driver. Nếu có vehicleId, gán/bỏ gán xe trong 1 transaction.
 */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return forbidden("Yêu cầu quyền Admin hoặc Manager");
  }

  try {
    const body   = await req.json();
    const parsed = UpdateDriverSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      // Gán/bỏ gán xe trong cùng transaction
      if (parsed.vehicleId !== undefined) {
        // Bỏ gán tài xế này khỏi tất cả xe cũ trước
        await tx.vehicle.updateMany({
          where: { driverId: params.id },
          data:  { driverId: null },
        });
        // Gán vào xe mới (nếu vehicleId không phải null)
        if (parsed.vehicleId !== null) {
          await tx.vehicle.update({
            where: { id: parsed.vehicleId },
            data:  { driverId: params.id },
          });
        }
      }

      // Cập nhật thông tin Driver
      const updateData: Record<string, unknown> = {};
      if (parsed.name      !== undefined) updateData.name      = parsed.name;
      if (parsed.phone     !== undefined) updateData.phone     = parsed.phone;
      if (parsed.licenseNo !== undefined) updateData.licenseNo = parsed.licenseNo;
      if (parsed.status    !== undefined) updateData.status    = parsed.status;

      return tx.driver.update({
        where:   { id: params.id },
        data:    updateData,
        include: {
          vehicle: { select: { id: true, plate: true, name: true, status: true } },
          user:    { select: { id: true, email: true } },
        },
      });
    });

    return ok(result);
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    return serverError("Lỗi khi cập nhật tài xế", err);
  }
}

// ── DELETE /api/drivers/[id] ──────────────────────────────────────────────────
/**
 * ERP Pattern: Xóa Driver + vô hiệu hóa User account trong 1 transaction.
 * Tài xế nghỉ việc phải bị thu hồi quyền đăng nhập ngay lập tức.
 */
export async function DELETE(_: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return forbidden("Chỉ Admin mới có thể xóa tài xế khỏi hệ thống");
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Lấy driver để biết userId
      const driver = await tx.driver.findUnique({
        where:  { id: params.id },
        select: { userId: true },
      });
      if (!driver) return;

      // Bỏ gán xe
      await tx.vehicle.updateMany({
        where: { driverId: params.id },
        data:  { driverId: null },
      });

      // Xóa Driver profile (onDelete: SetNull sẽ null userId trên User)
      await tx.driver.delete({ where: { id: params.id } });

      // Thu hồi User account: xóa hoặc vô hiệu hóa
      // → Chọn xóa hẳn vì ERP cần rõ ràng, audit trail đã có AuditLog
      if (driver.userId) {
        await tx.user.delete({ where: { id: driver.userId } });
      }
    });

    return ok({ deleted: true });
  } catch (err) {
    return serverError("Lỗi khi xóa tài xế", err);
  }
}
