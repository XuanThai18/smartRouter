"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Package, Truck, Leaf, DollarSign, TrendingUp,
  AlertTriangle, ArrowUpRight, Clock, CheckCircle2,
  Zap, ClipboardList, RefreshCw,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface DashData {
  totalOrders: number; pendingOrders: number; availableVehicles: number;
  deliveredOrders: number; totalCo2: number; totalCost: number;
  totalDist: number; totalPlans: number;
  ordersByDay: Array<{ date: string; count: number }>;
}
interface Order { id:string; code:string; customerName:string; address:string; status:string; demandKg:number; createdAt:string }

const C = {
  card: "bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)]",
};
const TT_STYLE = {
  contentStyle:{background:"hsl(220 14% 8%)",border:"1px solid hsl(220 14% 19%)",borderRadius:6,fontSize:11},
  labelStyle:{color:"hsl(215 16% 55%)"},
};
const STATUS_MAP: Record<string,{dot:string;label:string}> = {
  PENDING:    {dot:"bg-[hsl(var(--orange))]", label:"Chờ"},
  ASSIGNED:   {dot:"bg-[hsl(var(--primary))]",label:"Đã phân"},
  IN_TRANSIT: {dot:"bg-[hsl(var(--primary))]",label:"Đang giao"},
  DELIVERED:  {dot:"bg-[hsl(var(--green))]",  label:"Xong"},
  FAILED:     {dot:"bg-[hsl(var(--red))]",    label:"Thất bại"},
};

// Animated counter hook
function useCounter(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const steps = 30; const inc = target / steps;
    let cur = 0; const t = setInterval(() => {
      cur = Math.min(cur + inc, target);
      setVal(Math.round(cur));
      if (cur >= target) clearInterval(t);
    }, duration / steps);
    return () => clearInterval(t);
  }, [target, duration]);
  return val;
}

function KpiCard({ icon: Icon, label, value, sub, iconCls, prefix = "", suffix = "" }: {
  icon: React.ElementType; label: string; value: number;
  sub: string; iconCls: string; prefix?: string; suffix?: string;
}) {
  const animated = useCounter(value);
  return (
    <div className={`${C.card} p-5 fade-up`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">{label}</span>
        <div className={`w-8 h-8 rounded-[var(--radius)] flex items-center justify-center shrink-0 ${iconCls}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-[hsl(var(--text))]">
        {prefix}{animated}{suffix}
      </div>
      <div className="text-xs text-[hsl(var(--text-muted))] mt-1">{sub}</div>
    </div>
  );
}

const QUICK_ACTIONS = [
  {href:"/orders",   icon:Package,     label:"Thêm đơn hàng",   sub:"Nhập hoặc import Excel"},
  {href:"/optimize", icon:Zap,         label:"Tối ưu lộ trình", sub:"Chạy thuật toán NSGA-II"},
  {href:"/dispatch", icon:ClipboardList,label:"Điều phối xe",   sub:"Xem kế hoạch giao hàng"},
  {href:"/tracking", icon:Truck,       label:"Theo dõi đội xe", sub:"Vị trí GPS thời gian thực"},
];

export default function DashboardPage() {
  const [data, setData]         = useState<DashData | null>(null);
  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const [dash, ord] = await Promise.all([
      fetch("/api/dashboard").then(r => r.json()),
      fetch("/api/orders?limit=8").then(r => r.json()),
    ]);
    setData(dash); setOrders(ord.slice ? ord.slice(0,8) : []);
    setLastUpdated(new Date()); setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000); // auto-refresh 30s
    return () => clearInterval(t);
  }, [load]);

  const sk = (h = "h-4", w = "w-full") =>
    <div className={`${h} ${w} bg-[hsl(var(--bg-hover))] rounded animate-pulse`} />;

  return (
    <div className="p-6 space-y-5 w-full">

      {/* Last updated */}
      <div className="flex items-center justify-between">
        <div/>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))] transition-colors">
          <RefreshCw className="w-3 h-3"/>
          {lastUpdated ? `Cập nhật lúc ${lastUpdated.toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}` : "Đang tải..."}
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {loading || !data ? Array.from({length:4}).map((_,i)=>(
          <div key={i} className={`${C.card} p-5 space-y-3`}>{sk("h-3","w-24")}{sk("h-8","w-16")}{sk("h-3","w-32")}</div>
        )) : <>
          <KpiCard icon={Package}    label="Tổng đơn hàng"   value={data.totalOrders}
            sub={`${data.pendingOrders} chờ phân công`}
            iconCls="bg-[hsl(var(--primary-dim))] text-[hsl(var(--primary))]" />
          <KpiCard icon={CheckCircle2} label="Đã giao thành công" value={data.deliveredOrders}
            sub={`${data.totalOrders > 0 ? Math.round(data.deliveredOrders/data.totalOrders*100) : 0}% tỷ lệ hoàn thành`}
            iconCls="bg-[hsl(var(--green-dim))] text-[hsl(var(--green))]" />
          <KpiCard icon={Leaf}       label="CO₂ phát thải"   value={Math.round(data.totalCo2)}
            sub="kg — các chuyến gần đây" suffix=" kg"
            iconCls="bg-[hsl(var(--green-dim))] text-[hsl(var(--green))]" />
          <KpiCard icon={DollarSign} label="Chi phí vận hành" value={Math.round(data.totalCost)}
            sub={`${data.totalDist.toFixed(0)} km tổng quãng đường`} prefix="$"
            iconCls="bg-[hsl(var(--orange-dim))] text-[hsl(var(--orange))]" />
        </>}
      </div>

      {/* Alert */}
      {data && data.pendingOrders > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius)] border border-[hsl(var(--orange))/0.3] bg-[hsl(var(--orange-dim))] fade-up">
          <AlertTriangle className="w-4 h-4 text-[hsl(var(--orange))] shrink-0" />
          <span className="text-sm flex-1 text-[hsl(var(--text-sub))]">
            <strong className="text-[hsl(var(--text))]">{data.pendingOrders}</strong> đơn hàng chưa được phân công xe
          </span>
          <Link href="/optimize" className="flex items-center gap-1 text-xs font-semibold text-[hsl(var(--primary))] hover:underline">
            Tối ưu ngay <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Charts + Recent orders */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">

        {/* Orders chart */}
        <div className={`${C.card} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[hsl(var(--text))]">Đơn hàng 7 ngày</h2>
              <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">Xu hướng nhập đơn</p>
            </div>
            <TrendingUp className="w-4 h-4 text-[hsl(var(--text-muted))]" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data?.ordersByDay ?? []}>
              <defs>
                <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(213,94%,60%)" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="hsl(213,94%,60%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 14%)" />
              <XAxis dataKey="date" tick={{fill:"hsl(215 16% 55%)",fontSize:10}}
                tickFormatter={d=>d.slice(5)} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"hsl(215 16% 55%)",fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip {...TT_STYLE}/>
              <Area type="monotone" dataKey="count" name="Đơn hàng"
                stroke="hsl(213,94%,60%)" fill="url(#ga)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent orders */}
        <div className={`${C.card} flex flex-col`}>
          <div className="flex items-center justify-between px-5 py-3.5 shrink-0"
            style={{borderBottom:"1px solid hsl(var(--border))"}}>
            <h2 className="text-sm font-semibold text-[hsl(var(--text))]">Đơn hàng mới nhất</h2>
            <Link href="/orders" className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-0.5">
              Xem tất cả <ArrowUpRight className="w-3 h-3"/>
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[hsl(var(--border-sub))]">
            {loading ? Array.from({length:5}).map((_,i)=>(
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                {sk("h-3","w-16")}{sk("h-3","w-32")}
              </div>
            )) : orders.length === 0 ? (
              <div className="px-5 py-10 text-center text-xs text-[hsl(var(--text-muted))]">Chưa có đơn hàng</div>
            ) : orders.map(o=>{
              const s = STATUS_MAP[o.status] ?? {dot:"bg-gray-400",label:o.status};
              return (
                <div key={o.id} className="px-5 py-3 flex items-center gap-3 hover:bg-[hsl(var(--bg-hover))] transition-colors">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`}/>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[hsl(var(--text))] truncate">{o.customerName}</div>
                    <div className="text-[11px] text-[hsl(var(--text-muted))] truncate">{o.address}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-[hsl(var(--text-muted))]">{o.demandKg} kg</div>
                    <div className="text-[10px] text-[hsl(var(--text-muted))]">{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {QUICK_ACTIONS.map(a=>(
          <Link key={a.href} href={a.href}
            className={`${C.card} p-4 flex items-center gap-3 hover:bg-[hsl(var(--bg-hover))] transition-colors group`}>
            <div className="w-9 h-9 rounded-[var(--radius)] bg-[hsl(var(--bg-hover))] group-hover:bg-[hsl(var(--primary-dim))] transition-colors flex items-center justify-center shrink-0">
              <a.icon className="w-4 h-4 text-[hsl(var(--text-muted))] group-hover:text-[hsl(var(--primary))] transition-colors"/>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[hsl(var(--text))] truncate">{a.label}</div>
              <div className="text-[11px] text-[hsl(var(--text-muted))] truncate">{a.sub}</div>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-[hsl(var(--text-muted))] ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"/>
          </Link>
        ))}
      </div>

      {/* Performance */}
      <div className={`${C.card} p-5`}>
        <div className="flex items-center gap-2 mb-5">
          <Truck className="w-4 h-4 text-[hsl(var(--text-muted))]"/>
          <h2 className="text-sm font-semibold text-[hsl(var(--text))]">Hiệu suất vận hành</h2>
          <span className="text-xs text-[hsl(var(--text-muted))]">— Tháng này</span>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {[
            {label:"Giao thành công",     pct: data ? Math.round((data.deliveredOrders/Math.max(data.totalOrders,1))*100) : 0, color:"hsl(var(--green))"},
            {label:"Đúng khung giờ (TW)", pct:88, color:"hsl(var(--primary))"},
            {label:"Sử dụng tải trọng",   pct:67, color:"hsl(var(--orange))"},
            {label:"Giảm CO₂ vs baseline",pct:31, color:"hsl(142,72%,46%)"},
            {label:"Tiết kiệm NSGA-II",   pct:28, color:"hsl(var(--purple))"},
          ].map(s=>(
            <div key={s.label}>
              <div className="flex justify-between mb-1.5">
                <span className="text-[11px] text-[hsl(var(--text-sub))]">{s.label}</span>
                <span className="text-[11px] font-bold text-[hsl(var(--text))]">{s.pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[hsl(var(--bg-hover))] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{width:`${s.pct}%`, background:s.color}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
