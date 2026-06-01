import { NextRequest } from "next/server";
import { ZodError } from "zod";
import prisma from "@/lib/db";
import { ok, created, serverError, validationError, badRequest } from "@/lib/api";
import { CreateDriverSchema } from "@/lib/validators/driver.schema";

// ── GET /api/drivers ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const q      = searchParams.get("q")      ?? undefined;

    const drivers = await prisma.driver.findMany({
      where: {
        ...(status && { status }),
        ...(q && {
          OR: [
            { name:  { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }),
      },
      include: {
        vehicle: {
          select: { id: true, plate: true, name: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(drivers);
  } catch (err) {
    return serverError("Lỗi khi lấy danh sách tài xế", err);
  }
}

// ── POST /api/drivers ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = CreateDriverSchema.parse(body);

    // Kiểm tra số điện thoại trùng
    const exists = await prisma.driver.findFirst({ where: { phone: parsed.phone } });
    if (exists) return badRequest("Số điện thoại này đã được đăng ký cho tài xế khác");

    const driver = await prisma.driver.create({
      data: {
        name:      parsed.name,
        phone:     parsed.phone,
        licenseNo: parsed.licenseNo ?? null,
        status:    parsed.status,
      },
    });

    return created(driver);
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    return serverError("Lỗi khi tạo tài xế", err);
  }
}
