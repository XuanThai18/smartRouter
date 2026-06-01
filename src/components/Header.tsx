"use client";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Bell, CheckCircle2, Package, AlertTriangle, LogOut, User, ChevronDown } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/orders":    "Quản lý đơn hàng",
  "/fleet":     "Quản lý đội xe",
  "/optimize":  "Tối ưu lộ trình",
  "/dispatch":  "Điều phối",
  "/tracking":  "Theo dõi thực tế",
  "/reports":   "Báo cáo & Phân tích",
};

const ROLE_MAP: Record<string, { label: string; cls: string }> = {
  ADMIN:   { label: "Quản trị viên",  cls: "text-[hsl(var(--orange))]"  },
  MANAGER: { label: "Điều phối viên", cls: "text-[hsl(var(--primary))]" },
  DRIVER:  { label: "Tài xế",         cls: "text-[hsl(var(--green))]"   },
};

const NOTIFICATIONS = [
  { id: 1, icon: CheckCircle2, title: "Tối ưu lộ trình hoàn tất",    desc: "NSGA-II tìm thấy 5 nghiệm Pareto khả thi.", time: "2 phút trước", color: "var(--green)"   },
  { id: 2, icon: Package,      title: "Đơn hàng mới",                desc: "Có 3 đơn hàng mới được thêm vào hệ thống.", time: "1 giờ trước",  color: "var(--primary)" },
  { id: 3, icon: AlertTriangle,title: "Cảnh báo bảo trì",            desc: "Xe 29C-123.45 sắp đến hạn bảo trì định kỳ.", time: "Hôm qua",      color: "var(--orange)"  },
];

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase();
}

export default function Header() {
  const path   = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const title  = PAGE_TITLES[path] ?? "SmartRoute";

  const [showNoti, setShowNoti] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const notiRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notiRef.current && !notiRef.current.contains(e.target as Node)) setShowNoti(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUser(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const user     = session?.user as { name?: string; email?: string; role?: string } | undefined;
  const roleInfo = ROLE_MAP[user?.role ?? "MANAGER"] ?? ROLE_MAP["MANAGER"];

  return (
    <header
      style={{ borderBottom: "1px solid hsl(var(--border))", height: "56px" }}
      className="flex items-center justify-between px-6 bg-[hsl(var(--bg-card))] shrink-0"
    >
      <h1 className="text-sm font-semibold text-[hsl(var(--text))]">{title}</h1>

      <div className="flex items-center gap-1.5">

        {/* Notification bell */}
        <div className="relative" ref={notiRef}>
          <button
            onClick={() => setShowNoti(!showNoti)}
            className={`relative w-8 h-8 flex items-center justify-center rounded-[var(--radius)] transition-colors ${showNoti ? "bg-[hsl(var(--bg-hover))] text-[hsl(var(--text))]" : "hover:bg-[hsl(var(--bg-hover))] text-[hsl(var(--text-sub))]"}`}
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))]" />
          </button>

          {showNoti && (
            <div className="absolute top-full mt-2 right-0 w-80 bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)] shadow-xl z-50 fade-in fade-up">
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid hsl(var(--border-sub))" }}>
                <h3 className="text-sm font-semibold text-[hsl(var(--text))]">Thông báo</h3>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[hsl(var(--primary-dim))] text-[hsl(var(--primary))]">
                  {NOTIFICATIONS.length} mới
                </span>
              </div>
              <div className="max-h-[300px] overflow-y-auto divide-y divide-[hsl(var(--border-sub))]">
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
              <div className="p-2" style={{ borderTop: "1px solid hsl(var(--border-sub))" }}>
                <button className="w-full py-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))] hover:bg-[hsl(var(--bg-hover))] rounded transition-colors text-center">
                  Đánh dấu tất cả đã đọc
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-[hsl(var(--border))] mx-1" />

        {/* User avatar + dropdown */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUser(!showUser)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius)] hover:bg-[hsl(var(--bg-hover))] transition-colors"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
              style={{ background: "hsl(var(--primary-dim))", color: "hsl(var(--primary))" }}
            >
              {user?.name ? getInitials(user.name) : <User className="w-4 h-4" />}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-[hsl(var(--text))] leading-tight max-w-[100px] truncate">
                {user?.name ?? "Người dùng"}
              </div>
              <div className={`text-[10px] leading-tight ${roleInfo.cls}`}>
                {roleInfo.label}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-[hsl(var(--text-muted))]" />
          </button>

          {showUser && (
            <div className="absolute top-full mt-1 right-0 w-52 bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)] shadow-xl z-50 fade-up py-1">
              <div className="px-3 py-2.5" style={{ borderBottom: "1px solid hsl(var(--border-sub))" }}>
                <div className="text-xs font-semibold text-[hsl(var(--text))] truncate">{user?.name}</div>
                <div className="text-[11px] text-[hsl(var(--text-muted))] truncate mt-0.5">{user?.email}</div>
                <div className={`text-[10px] font-medium mt-1 ${roleInfo.cls}`}>{roleInfo.label}</div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--text-sub))] hover:text-[hsl(var(--red))] hover:bg-[hsl(var(--bg-hover))] transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
