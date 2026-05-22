"use client";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bell, Search, CheckCircle2, Package, AlertTriangle, X } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/orders":    "Quản lý đơn hàng",
  "/fleet":     "Quản lý đội xe",
  "/optimize":  "Tối ưu lộ trình",
  "/dispatch":  "Điều phối",
  "/tracking":  "Theo dõi thực tế",
  "/reports":   "Báo cáo & Phân tích",
};

const NOTIFICATIONS = [
  { id: 1, type: "success", icon: CheckCircle2, title: "Tối ưu lộ trình hoàn tất", desc: "NSGA-II tìm thấy 5 nghiệm Pareto khả thi.", time: "2 phút trước", color: "var(--green)" },
  { id: 2, type: "info",    icon: Package,      title: "Đơn hàng mới", desc: "Có 3 đơn hàng mới được thêm vào hệ thống.", time: "1 giờ trước", color: "var(--primary)" },
  { id: 3, type: "warning", icon: AlertTriangle,title: "Cảnh báo bảo trì", desc: "Xe 29C-123.45 sắp đến hạn bảo trì định kỳ.", time: "Hôm qua", color: "var(--orange)" },
];

export default function Header() {
  const path = usePathname();
  const title = PAGE_TITLES[path] ?? "SmartRoute";
  const [showNoti, setShowNoti] = useState(false);
  const notiRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notiRef.current && !notiRef.current.contains(e.target as Node)) {
        setShowNoti(false);
      }
    };
    if (showNoti) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNoti]);

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
        <div className="relative" ref={notiRef}>
          <button 
            onClick={() => setShowNoti(!showNoti)}
            className={`relative w-8 h-8 flex items-center justify-center rounded-[var(--radius)] transition-colors ${showNoti ? 'bg-[hsl(var(--bg-hover))] text-[hsl(var(--text))]' : 'hover:bg-[hsl(var(--bg-hover))] text-[hsl(var(--text-sub))]'}`}
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))]" />
          </button>

          {showNoti && (
            <div className="absolute top-full mt-2 right-0 w-80 bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)] shadow-xl z-50 fade-in fade-up">
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid hsl(var(--border-subtle))" }}>
                <h3 className="text-sm font-semibold text-[hsl(var(--text))]">Thông báo</h3>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[hsl(var(--primary-dim))] text-[hsl(var(--primary))]">
                  {NOTIFICATIONS.length} mới
                </span>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {NOTIFICATIONS.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-[hsl(var(--text-muted))]">Không có thông báo mới.</div>
                ) : (
                  <div className="divide-y divide-[hsl(var(--border-subtle))]">
                    {NOTIFICATIONS.map((n) => (
                      <div key={n.id} className="p-4 hover:bg-[hsl(var(--bg-hover))] transition-colors cursor-pointer group">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `hsl(${n.color} / 0.15)` }}>
                            <n.icon className="w-4 h-4" style={{ color: `hsl(${n.color})` }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[hsl(var(--text))] group-hover:text-[hsl(var(--primary))] transition-colors truncate">{n.title}</p>
                            <p className="text-[11px] text-[hsl(var(--text-muted))] mt-0.5 leading-snug">{n.desc}</p>
                            <p className="text-[10px] text-[hsl(var(--text-sub))] mt-1.5">{n.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-2" style={{ borderTop: "1px solid hsl(var(--border-subtle))" }}>
                <button className="w-full py-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))] hover:bg-[hsl(var(--bg-hover))] rounded transition-colors text-center">
                  Đánh dấu tất cả đã đọc
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Date */}
        <span suppressHydrationWarning className="text-[11px] text-[hsl(var(--text-muted))] pl-1">
          {new Date().toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "short" })}
        </span>
      </div>
    </header>
  );
}
