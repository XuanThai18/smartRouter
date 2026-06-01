"use client";
import { useEffect, useState } from "react";
import { BarChart3, TrendingDown, Leaf, DollarSign, Package, CheckCircle2, Upload } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, CartesianGrid, Legend,
} from "recharts";
import { fetchApi } from "@/lib/fetchApi";

interface ReportData {
  weekly: Array<{date:string;cost:number;co2:number;orders:number;km:number}>;
  totals: {co2:number;cost:number;km:number;plans:number;orders:number;delivered:number};
  latestParetoSize: number;
}

// Convergence dữ liệu mô phỏng (thực tế lấy từ engine history)
const CONVERGENCE = Array.from({length:50},(_,i)=>{
  const t = i/49;
  const v = 48000-(48000-9500)*(1-Math.exp(-4*t))+(Math.random()-.5)*400*(1-t);
  return { gen:i*10, fitness:+v.toFixed(0), feasible:Math.min(Math.round(t*18),18) };
});

const C = {
  card: "bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)]",
  tt: {
    contentStyle:{background:"hsl(220 14% 8%)",border:"1px solid hsl(220 14% 19%)",borderRadius:6,fontSize:11},
    labelStyle:{color:"hsl(215 16% 55%)"},
  },
};

const axisProps = { tick:{fill:"hsl(215 16% 55%)",fontSize:10}, axisLine:false, tickLine:false };
const gridProps = { strokeDasharray:"3 3", stroke:"hsl(220 14% 14%)" };

export default function ReportsPage() {
  const [data, setData] = useState<ReportData|null>(null);

  useEffect(()=>{
    fetchApi<ReportData>("/api/reports").then(setData);
  },[]);

  const skeleton = (h="h-4",w="w-full") => <div className={`${h} ${w} bg-[hsl(var(--bg-hover))] rounded animate-pulse`}/>;

  const kpis = data ? [
    {icon:Package,    label:"Tổng đơn hàng",     value:data.totals.orders,           sub:`${data.totals.delivered} đã giao`,   col:"var(--primary)"},
    {icon:BarChart3,  label:"Kế hoạch đã tối ưu", value:data.totals.plans,            sub:`Pareto ${data.latestParetoSize} nghiệm`, col:"var(--purple)"},
    {icon:Leaf,       label:"Tổng CO₂ (7 ngày)",  value:`${data.totals.co2.toFixed(1)} kg`, sub:"Phát thải vận chuyển",          col:"var(--green)"},
    {icon:DollarSign, label:"Tổng chi phí (7 ngày)",value:`$${data.totals.cost.toFixed(0)}`, sub:`${data.totals.km.toFixed(0)} km tổng`, col:"var(--orange)"},
  ] : [];

  return (
    <div className="p-6 space-y-4 w-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-[hsl(var(--text))]">Báo cáo & Phân tích</h1>
        <a href="/api/export/report" className="btn-secondary text-xs" download>
          <Upload className="w-3.5 h-3.5 rotate-180" /> Xuất PDF
        </a>
      </div>


      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {!data ? [0,1,2,3].map(i=>(
          <div key={i} className={`${C.card} p-5 space-y-3`}>
            {skeleton("h-3","w-24")}{skeleton("h-7","w-16")}{skeleton("h-3","w-32")}
          </div>
        )) : kpis.map(k=>(
          <div key={k.label} className={`${C.card} p-5`}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[hsl(var(--text-muted))]">{k.label}</span>
              <div className="w-7 h-7 rounded-[var(--radius)] flex items-center justify-center shrink-0"
                style={{background:`hsl(${k.col} / .15)`, color:`hsl(${k.col})`}}>
                <k.icon className="w-3.5 h-3.5"/>
              </div>
            </div>
            <div className="text-2xl font-bold text-[hsl(var(--text))]">{k.value}</div>
            <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Row 2: Convergence + Cost chart */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* NSGA-II Convergence */}
        <div className={`${C.card} p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-4 h-4 text-[hsl(var(--primary))]"/>
            <div>
              <h2 className="text-sm font-semibold text-[hsl(var(--text))]">Hội tụ NSGA-II</h2>
              <p className="text-[11px] text-[hsl(var(--text-muted))]">Best fitness & nghiệm khả thi qua các thế hệ</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={CONVERGENCE}>
              <CartesianGrid {...gridProps}/>
              <XAxis dataKey="gen" {...axisProps}/>
              <YAxis yAxisId="left"  {...axisProps}/>
              <YAxis yAxisId="right" orientation="right" {...axisProps}/>
              <Tooltip {...C.tt}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              <Line yAxisId="left"  type="monotone" dataKey="fitness"  name="Best Fitness"    stroke="hsl(213,94%,60%)" strokeWidth={2} dot={false}/>
              <Line yAxisId="right" type="monotone" dataKey="feasible" name="Nghiệm khả thi"  stroke="hsl(142,72%,46%)" strokeWidth={1.5} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-[hsl(var(--text-muted))] text-center mt-1">
            Hội tụ sau ~300 thế hệ · Plateau Δ &lt; 2%
          </p>
        </div>

        {/* Weekly cost+co2 */}
        <div className={`${C.card} p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-[hsl(var(--orange))]"/>
            <div>
              <h2 className="text-sm font-semibold text-[hsl(var(--text))]">Chi phí & CO₂ theo ngày</h2>
              <p className="text-[11px] text-[hsl(var(--text-muted))]">7 ngày gần nhất</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.weekly ?? []}>
              <CartesianGrid {...gridProps}/>
              <XAxis dataKey="date" {...axisProps} tickFormatter={(d:string)=>d.slice(5)}/>
              <YAxis {...axisProps}/>
              <Tooltip {...C.tt}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              <Bar dataKey="cost" name="Chi phí ($)"  fill="hsl(38,92%,52%)"  radius={[3,3,0,0]}/>
              <Bar dataKey="co2"  name="CO₂ (kg)"     fill="hsl(142,72%,46%)" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Orders area + Performance */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4">

        {/* Orders trend */}
        <div className={`${C.card} p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-[hsl(var(--primary))]"/>
            <div>
              <h2 className="text-sm font-semibold text-[hsl(var(--text))]">Đơn hàng theo ngày</h2>
              <p className="text-[11px] text-[hsl(var(--text-muted))]">7 ngày gần nhất</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data?.weekly ?? []}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(213,94%,60%)" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="hsl(213,94%,60%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps}/>
              <XAxis dataKey="date" {...axisProps} tickFormatter={(d:string)=>d.slice(5)}/>
              <YAxis {...axisProps}/>
              <Tooltip {...C.tt}/>
              <Area type="monotone" dataKey="orders" name="Đơn hàng"
                stroke="hsl(213,94%,60%)" fill="url(#grad1)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* KPI bars */}
        <div className={`${C.card} p-5`}>
          <div className="flex items-center gap-2 mb-5">
            <CheckCircle2 className="w-4 h-4 text-[hsl(var(--green))]"/>
            <h2 className="text-sm font-semibold text-[hsl(var(--text))]">Hiệu suất vận hành</h2>
          </div>
          <div className="space-y-4">
            {[
              {label:"Tỷ lệ giao thành công",      pct: data ? Math.round((data.totals.delivered/Math.max(data.totals.orders,1))*100) : 0, color:"hsl(var(--green))"},
              {label:"Đúng khung giờ (TW)",          pct:88,  color:"hsl(var(--primary))"},
              {label:"Sử dụng tải trọng TB",         pct:67,  color:"hsl(var(--orange))"},
              {label:"Giảm CO₂ vs baseline",         pct:31,  color:"hsl(142,72%,46%)"},
              {label:"Tiết kiệm chi phí NSGA-II",    pct:28,  color:"hsl(var(--purple))"},
            ].map(s=>(
              <div key={s.label}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-[hsl(var(--text-sub))]">{s.label}</span>
                  <span className="text-xs font-bold text-[hsl(var(--text))]">{s.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[hsl(var(--bg-hover))]">
                  <div className="h-full rounded-full transition-all" style={{width:`${s.pct}%`,background:s.color}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
