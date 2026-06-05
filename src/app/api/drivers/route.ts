import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { hash } from "bcryptjs";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { ok, created, serverError, validationError, badRequest, forbidden } from "@/lib/api";
import { CreateDriverSchema } from "@/lib/validators/driver.schema";

// ── GET /api/drivers ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return forbidden("Yêu cầu quyền Admin hoặc Manager");
  }

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
        vehicle: { select: { id: true, plate: true, name: true, status: true } },
        user:    { select: { id: true, email: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(drivers);
  } catch (err) {
    return serverError("Lỗi khi lấy danh sách tài xế", err);
  }
}

// ── POST /api/drivers ─────────────────────────────────────────────────────────
/**
 * ERP Pattern: Admin/Manager tạo hồ sơ Driver + cấp tài khoản User
 * trong 1 transaction nguyên tử. bcrypt hash được thực hiện TRƯỚC transaction
 * để tránh giữ connection DB lâu trong CPU-bound operation.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return forbidden("Chỉ Admin hoặc Manager mới có thể tạo tài xế");
  }

  try {
    const body   = await req.json();
    const parsed = CreateDriverSchema.parse(body);

    // Kiểm tra trùng lặp TRƯỚC transaction để tránh rollback không cần thiết
    const [phoneExists, emailExists] = await Promise.all([
      prisma.driver.findFirst({ where: { phone: parsed.phone } }),
      parsed.email ? prisma.user.findUnique({ where: { email: parsed.email } }) : null,
    ]);

    if (phoneExists) return badRequest("Số điện thoại này đã được đăng ký cho tài xế khác");
    if (emailExists) return badRequest("Email này đã được dùng cho tài khoản khác trong hệ thống");

    // Hash password TRƯỚC transaction (CPU-heavy, không nên giữ DB connection)
    const passwordHash = (parsed.email && parsed.password)
      ? await hash(parsed.password, 10)
      : null;

    // Atomic transaction: chỉ chứa I/O DB thuần túy
    const result = await prisma.$transaction(async (tx) => {
      let userId: string | null = null;

      if (passwordHash && parsed.email) {
        const newUser = await tx.user.create({
          data: { name: parsed.name, email: parsed.email, passwordHash, role: "DRIVER" },
        });
        userId = newUser.id;
      }

      return tx.driver.create({
        data: {
          name:      parsed.name,
          phone:     parsed.phone,
          licenseNo: parsed.licenseNo ?? null,
          status:    parsed.status,
          ...(userId && { userId }),
        },
        include: { user: { select: { id: true, email: true } } },
      });
    });

    return created(result);
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    return serverError("Lỗi khi tạo tài xế", err);
  }
}
