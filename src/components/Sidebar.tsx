"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, Truck, Zap,
  ClipboardList, MapPin, BarChart3, Route,
} from "lucide-react";

const NAV = [
  {
    group: "Tổng quan",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/reports",   icon: BarChart3,        label: "Báo cáo" },
    ],
  },
  {
    group: "Vận hành",
    items: [
      { href: "/orders",   icon: Package,       label: "Đơn hàng" },
      { href: "/fleet",    icon: Truck,         label: "Đội xe" },
      { href: "/dispatch", icon: ClipboardList, label: "Điều phối" },
      { href: "/tracking", icon: MapPin,        label: "Theo dõi" },
    ],
  },
  {
    group: "Tối ưu hóa",
    items: [
      { href: "/optimize", icon: Zap, label: "Tối ưu tuyến đường" },
    ],
  },
] as const;

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside
      style={{ width: "var(--sidebar-w)", borderRight: "1px solid hsl(var(--border))" }}
      className="flex flex-col shrink-0 h-screen bg-[hsl(var(--bg-card))]"
    >
      {/* Brand */}
      <div
        style={{ borderBottom: "1px solid hsl(var(--border))" }}
        className="flex items-center gap-2.5 px-5 h-14"
      >
        <div className="w-7 h-7 rounded-md bg-[hsl(var(--primary))] flex items-center justify-center">
          <Route className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-[hsl(var(--text))] text-sm tracking-tight">
          SmartRoute
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {NAV.map(({ group, items }) => (
          <div key={group}>
            <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">
              {group}
            </p>
            <div className="space-y-0.5">
              {items.map(({ href, icon: Icon, label }) => {
                const active = path === href || path.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius)] text-sm font-medium transition-colors ${
                      active
                        ? "bg-[hsl(var(--primary-dim))] text-[hsl(var(--primary))]"
                        : "text-[hsl(var(--text-sub))] hover:bg-[hsl(var(--bg-hover))] hover:text-[hsl(var(--text))]"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div
        style={{ borderTop: "1px solid hsl(var(--border))" }}
        className="px-3 py-3"
      >
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius)] hover:bg-[hsl(var(--bg-hover))] cursor-pointer transition-colors">
          <div className="w-7 h-7 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center text-xs font-bold text-white shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[hsl(var(--text))] truncate">Admin</p>
            <p className="text-[11px] text-[hsl(var(--text-muted))] truncate">admin@smartroute.vn</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
