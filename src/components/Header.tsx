"use client";
import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/orders":    "Quản lý đơn hàng",
  "/fleet":     "Quản lý đội xe",
  "/optimize":  "Tối ưu lộ trình",
  "/dispatch":  "Điều phối",
  "/tracking":  "Theo dõi thực tế",
  "/reports":   "Báo cáo & Phân tích",
};

export default function Header() {
  const path = usePathname();
  const title = PAGE_TITLES[path] ?? "SmartRoute";

  return (
    <header
      style={{ borderBottom: "1px solid hsl(var(--border))", height: "56px" }}
      className="flex items-center justify-between px-6 bg-[hsl(var(--bg-card))] shrink-0"
    >
      <h1 className="text-sm font-semibold text-[hsl(var(--text))]">{title}</h1>

      <div className="flex items-center gap-2">
        {/* Search bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius)] bg-[hsl(var(--bg-hover))] border border-[hsl(var(--border-subtle))] text-[hsl(var(--text-muted))] text-xs w-48">
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span>Tìm kiếm...</span>
        </div>

        {/* Notification */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-[var(--radius)] hover:bg-[hsl(var(--bg-hover))] text-[hsl(var(--text-sub))] transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))]" />
        </button>

        {/* Date */}
        <span suppressHydrationWarning className="text-[11px] text-[hsl(var(--text-muted))] pl-1">
          {new Date().toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "short" })}
        </span>
      </div>
    </header>
  );
}
