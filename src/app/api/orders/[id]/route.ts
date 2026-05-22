import { NextRequest } from "next/server";
import { ZodError } from "zod";
import prisma from "@/lib/db";
import { ok, notFound, serverError, validationError } from "@/lib/api";
import { UpdateOrderSchema } from "@/lib/validators/order.schema";

type RouteContext = { params: { id: string } };

// ── GET /api/orders/[id] ─────────────────────────────────────────────────────
export async function GET(_: NextRequest, { params }: RouteContext) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        routeStop: {
          include: {
            route: { include: { plan: true, vehicle: true } },
          },
        },
      },
    });
    if (!order) return notFound("Không tìm thấy đơn hàng");
    return ok(order);
  } catch (err) {
    return serverError("Lỗi khi lấy đơn hàng", err);
  }
}

// ── PUT /api/orders/[id] ─────────────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const body = await req.json();
    const parsed = UpdateOrderSchema.parse(body);

    // Chỉ update các trường được gửi lên (partial update)
    const data: Record<string, unknown> = {};
    if (parsed.customerName !== undefined) data.customerName = parsed.customerName;
    if (parsed.phone        !== undefined) data.phone        = parsed.phone;
    if (parsed.address      !== undefined) data.address      = parsed.address;
    if (parsed.lat          !== undefined) data.lat          = parsed.lat;
    if (parsed.lng          !== undefined) data.lng          = parsed.lng;
    if (parsed.demandKg     !== undefined) data.demandKg     = parsed.demandKg;
    if (parsed.twStart      !== undefined) data.twStart      = parsed.twStart;
    if (parsed.twEnd        !== undefined) data.twEnd        = parsed.twEnd;
    if (parsed.serviceMin   !== undefined) data.serviceMin   = parsed.serviceMin;
    if (parsed.status       !== undefined) data.status       = parsed.status;

    const order = await prisma.order.update({
      where: { id: params.id },
      data,
    });
    return ok(order);
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    return serverError("Lỗi khi cập nhật đơn hàng", err);
  }
}

// ── DELETE /api/orders/[id] ──────────────────────────────────────────────────
export async function DELETE(_: NextRequest, { params }: RouteContext) {
  try {
    await prisma.order.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (err) {
    return serverError("Lỗi khi xóa đơn hàng", err);
  }
}
