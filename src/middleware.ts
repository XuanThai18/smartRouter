import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path  = req.nextUrl.pathname;

    // Chặn Manager không được truy cập Báo cáo & phân tích
    if ((path.startsWith("/reports") || path.startsWith("/api/reports")) && token?.role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "Forbidden - Yêu cầu quyền Quản trị viên" }, { status: 403 });
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Cho phép vào nếu đã có token JWT hợp lệ
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  // Bảo vệ tất cả API routes (trừ auth) và tất cả dashboard pages
  matcher: [
    "/dashboard/:path*",
    "/orders/:path*",
    "/fleet/:path*",
    "/optimize/:path*",
    "/dispatch/:path*",
    "/tracking/:path*",
    "/reports/:path*",
    "/api/orders/:path*",
    "/api/vehicles/:path*",
    "/api/drivers/:path*",
    "/api/optimize/:path*",
    "/api/dispatch/:path*",
    "/api/dashboard/:path*",
    "/api/reports/:path*",
  ],
};
