import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path  = req.nextUrl.pathname;

    // ── Hạn chế quyền DRIVER ────────────────────────────────────────────────
    // Tài xế chỉ được vào trang /my-routes và gọi API tương ứng
    const DRIVER_ALLOWED = [
      "/my-routes", 
      "/api/my-routes",
      "/api/auth",
    ];
    if (token?.role === "DRIVER") {
      const allowed = DRIVER_ALLOWED.some(p => path.startsWith(p));
      if (!allowed) {
        // Chuyển hướng về trang chuyến hàng của tài xế
        return NextResponse.redirect(new URL("/my-routes", req.url));
      }
    }

    // ── Hạn chế quyền MANAGER ────────────────────────────────────────────────
    // Manager không được vào trang Báo cáo & phân tích (chỉ dành cho Admin)
    if (
      (path.startsWith("/reports") || path.startsWith("/api/reports")) &&
      token?.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { ok: false, error: "Forbidden - Yêu cầu quyền Quản trị viên" },
        { status: 403 }
      );
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
    "/drivers/:path*",
    "/optimize/:path*",
    "/dispatch/:path*",
    "/my-routes/:path*",
    "/tracking/:path*",
    "/reports/:path*",
    "/api/orders/:path*",
    "/api/vehicles/:path*",
    "/api/drivers/:path*",
    "/api/my-routes",
    "/api/optimize/:path*",
    "/api/dispatch/:path*",
    "/api/dashboard/:path*",
    "/api/reports/:path*",
  ],
};
