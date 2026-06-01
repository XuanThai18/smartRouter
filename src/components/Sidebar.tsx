"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, Package, Truck, Zap,
  ClipboardList, MapPin, BarChart3, Route,
} from "lucide-react";

const NAV = [
  {
    group: "Tổng quan",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["ADMIN", "MANAGER"] },
      { href: "/reports",   icon: BarChart3,        label: "Báo cáo",   roles: ["ADMIN"] },
    ],
  },
  {
    group: "Vận hành",
    items: [
      { href: "/orders",   icon: Package,       label: "Đơn hàng",  roles: ["ADMIN", "MANAGER"] },
      { href: "/fleet",    icon: Truck,         label: "Đội xe",    roles: ["ADMIN", "MANAGER"] },
      { href: "/dispatch", icon: ClipboardList, label: "Điều phối", roles: ["ADMIN", "MANAGER"] },
      { href: "/tracking", icon: MapPin,        label: "Theo dõi",  roles: ["ADMIN", "MANAGER"] },
    ],
  },
  {
    group: "Tối ưu hóa",
    items: [
      { href: "/optimize", icon: Zap, label: "Tối ưu tuyến đường", roles: ["ADMIN", "MANAGER"] },
    ],
  },
] as const;

export default function Sidebar() {
  const path = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "MANAGER";

  return (
    <aside
      style={{ width: "var(--sidebar-w)", borderRight: "1px solid hsl(var(--border))" }}
      className="flex flex-col shrink-0 h-screen bg-[hsl(var(--bg-card))]"
    >
      {/* Brand */}
      <div
        style={{ borderBottom: "1px solid hsl(var(--border))" }}
        className="flex items-center gap-2.5 px-5 h-14 shrink-0"
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
        {NAV.map(({ group, items }) => {
          // Lọc các item dựa trên role hiện tại
          const visibleItems = items.filter(item => item.roles.includes(userRole));
          
          if (visibleItems.length === 0) return null;

          return (
            <div key={group}>
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">
                {group}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map(({ href, icon: Icon, label }) => {
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
          );
        })}
      </nav>
    </aside>
  );
}
