import { NextRequest } from "next/server";
import { ZodError } from "zod";
import prisma from "@/lib/db";
import { ok, created, badRequest, notFound, serverError, validationError } from "@/lib/api";
import { CreateOrderSchema, UpdateOrderSchema } from "@/lib/validators/order.schema";
import { DEFAULT_PAGE_LIMIT } from "@/lib/constants";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// ── GET /api/orders ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const date   = searchParams.get("date")   ?? undefined;
    const limit  = Math.min(
      Number(searchParams.get("limit") ?? DEFAULT_PAGE_LIMIT),
      DEFAULT_PAGE_LIMIT
    );

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (date) {
      const d = new Date(date);
      if (isNaN(d.getTime())) return badRequest("Định dạng ngày không hợp lệ");
      where.date = { gte: d, lt: new Date(d.getTime() + 86_400_000) };
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return ok(orders);
  } catch (err) {
    return serverError("Lỗi khi lấy danh sách đơn hàng", err);
  }
}

// ── POST /api/orders ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateOrderSchema.parse(body);

    const order = await prisma.order.create({
      data: {
        customerName: parsed.customerName,
        phone:        parsed.phone ?? null,
        address:      parsed.address,
        lat:          parsed.lat,
        lng:          parsed.lng,
        demandKg:     parsed.demandKg,
        twStart:      parsed.twStart,
        twEnd:        parsed.twEnd,
        serviceMin:   parsed.serviceMin,
        status:       "PENDING",
        date:         parsed.date ? new Date(parsed.date) : new Date(),
      },
    });

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await logAudit(session.user.id, "CREATE", "Order", order.id, { code: order.code, address: order.address });
    }

    return created(order);
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    return serverError("Lỗi khi tạo đơn hàng", err);
  }
}
