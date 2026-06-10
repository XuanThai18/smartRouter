import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { ok, created, serverError, badRequest, forbidden } from "@/lib/api";

type RouteContext = { params: { id: string } };

/**
 * PATCH /api/drivers/[id]/provision
 * Cấp tài khoản đăng nhập cho tài xế CHƯA có tài khoản.
 * Body: { email, password }
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return forbidden("Yêu cầu quyền Admin hoặc Manager");
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return badRequest("Email và mật khẩu không được để trống");
    }
    if (password.length < 6) {
      return badRequest("Mật khẩu phải có ít nhất 6 ký tự");
    }

    // Kiểm tra tài xế tồn tại và chưa có tài khoản
    const driver = await prisma.driver.findUnique({
      where: { id: params.id },
      include: { user: true },
    });
    if (!driver) return badRequest("Không tìm thấy tài xế");
    if (driver.userId) return badRequest("Tài xế này đã có tài khoản đăng nhập");

    // Kiểm tra email trùng
    const emailExists = await prisma.user.findUnique({ where: { email } });
    if (emailExists) return badRequest("Email này đã được dùng trong hệ thống");

    // Hash password ngoài transaction
    const passwordHash = await hash(password, 10);

    // Atomic: tạo User và link vào Driver
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { name: driver.name, email, passwordHash, role: "DRIVER" },
      });
      return tx.driver.update({
        where: { id: params.id },
        data: { userId: newUser.id },
        include: { user: { select: { id: true, email: true } } },
      });
    });

    return created({ driver: result, message: "Đã cấp tài khoản thành công" });
  } catch (err) {
    return serverError("Lỗi khi cấp tài khoản", err);
  }
}

/**
 * DELETE /api/drivers/[id]/provision
 * Thu hồi tài khoản đăng nhập (chỉ xóa User, giữ nguyên hồ sơ Driver).
 * Chỉ ADMIN được phép.
 */
export async function DELETE(_: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return forbidden("Chỉ Admin mới có thể thu hồi tài khoản");
  }

  try {
    const driver = await prisma.driver.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });
    if (!driver) return badRequest("Không tìm thấy tài xế");
    if (!driver.userId) return badRequest("Tài xế này chưa có tài khoản");

    await prisma.$transaction(async (tx) => {
      // Null userId trên Driver trước (do onDelete: SetNull sẽ tự làm, nhưng explicit rõ ràng hơn)
      await tx.driver.update({
        where: { id: params.id },
        data: { userId: null },
      });
      await tx.user.delete({ where: { id: driver.userId! } });
    });

    return ok({ revoked: true, message: "Đã thu hồi tài khoản" });
  } catch (err) {
    return serverError("Lỗi khi thu hồi tài khoản", err);
  }
}
