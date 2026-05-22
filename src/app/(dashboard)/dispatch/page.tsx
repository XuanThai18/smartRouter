"use client";
import { useEffect, useState } from "react";
import {
  ClipboardList, Truck, MapPin, Clock,
  CheckCircle2, ChevronRight, Printer, RefreshCw,
} from "lucide-react";
import { fetchApi, postApi } from "@/lib/fetchApi";

interface Stop   { id:string; position:number; arrivalEst:number; departureEst:number; status:string; order:{customerName:string;address:string;demandKg:number;phone?:string} }
interface Route  { id:string; vehicle:{plate:string;name:string}; distance:number; co2:number; cost:number; loadUsed:number; timeUsed?:number; feasible:boolean; stops:Stop[] }
interface Plan   { id:string; date:string; status:string; routes:Route[]; createdAt:string }

const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
function minToTime(m:number){ return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`; }

const STATUS_PLAN: Record<string,{label:string;cls:string}> = {
  DRAFT:       {label:"Nháp",        cls:"bg-gray-500/15 text-gray-400"},
  READY:       {label:"Sẵn sàng",    cls:"bg-blue-500/15 text-blue-400"},
  DISPATCHED:  {label:"Đã điều phối",cls:"bg-green-500/15 text-green-400"},
  COMPLETED:   {label:"Hoàn thành",  cls:"bg-emerald-500/15 text-emerald-400"},
};

const C = {
  card: "bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)]",
};

export default function DispatchPage() {
  const [plans, setPlans]       = useState<Plan[]>([]);
  const [selected, setSelected] = useState<Plan|null>(null);
  const [loading, setLoading]   = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [viewMode, setViewMode] = useState<"list"|"gantt">("list");

  const load = async () => {
    setLoading(true);
    const data = await fetchApi<Plan[]>("/api/optimize");
    setPlans(data);
    if (data.length && !selected) setSelected(data[0]);
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);

  const handleDispatch = async () => {
    if (!selected) return;
    setDispatching(true);
    const res = await postApi("/api/optimize/dispatch", { planId: selected.id });
    if (res) { await load(); }
    setDispatching(false);
  };

  const handlePrint = () => {
    if (!selected) return;
    const win = window.open("","_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Lệnh Giao Hàng — ${new Date(selected.date).toLocaleDateString("vi-VN")}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:12px;margin:20px}
        h1{font-size:16px;border-bottom:2px solid #000;padding-bottom:8px}
        h2{font-size:14px;margin-top:16px;background:#f0f0f0;padding:6px}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
        th{background:#e8e8e8;font-weight:bold}
        .footer{margin-top:24px;border-top:1px solid #ccc;padding-top:8px;font-size:11px;color:#666}
      </style></head><body>
      <h1>📋 LỆNH GIAO HÀNG — SmartRoute ERP</h1>
      <p><strong>Ngày:</strong> ${new Date(selected.date).toLocaleDateString("vi-VN")}</p>
      <p><strong>Trạng thái:</strong> ${STATUS_PLAN[selected.status]?.label}</p>
      ${selected.routes.map((r,i)=>`
        <h2>Xe ${i+1}: ${r.vehicle.plate} — ${r.stops.length} điểm giao</h2>
        <p>Quãng đường: ${r.distance.toFixed(1)} km | CO₂: ${r.co2.toFixed(2)} kg | Chi phí: $${r.cost.toFixed(0)} | Tải: ${r.loadUsed.toFixed(1)} kg</p>
        <table>
          <thead><tr><th>#</th><th>Khách hàng</th><th>Địa chỉ</th><th>SĐT</th><th>KL (kg)</th><th>ETA</th><th>Ghi chú</th></tr></thead>
          <tbody>${r.stops.map(s=>`
            <tr>
              <td>${s.position+1}</td>
              <td>${s.order.customerName}</td>
              <td>${s.order.address}</td>
              <td>${s.order.phone??""}</td>
              <td>${s.order.demandKg}</td>
              <td>${minToTime(s.arrivalEst)}</td>
              <td></td>
            </tr>`).join("")}
          </tbody>
        </table>
      `).join("")}
      <div class="footer">In bởi SmartRoute ERP | NSGA-II Optimization | ${new Date().toLocaleString("vi-VN")}</div>
    </body></html>`);
    win.document.close();
    win.print();
  };

  const totalStops = selected?.routes.reduce((s,r)=>s+r.stops.length,0)??0;
  const totalKm    = selected?.routes.reduce((s,r)=>s+r.distance,0)??0;
  const totalCo2   = selected?.routes.reduce((s,r)=>s+r.co2,0)??0;
  const totalCost  = selected?.routes.reduce((s,r)=>s+r.cost,0)??0;

  return (
    <div className="p-6 w-full">
      <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-4">

        {/* Plan list */}
        <div className={`${C.card} overflow-hidden`}>
          <div className="px-4 py-3 flex items-center justify-between" style={{borderBottom:"1px solid hsl(var(--border))"}}>
            <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">Kế hoạch giao hàng</span>
            <button onClick={load} className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))] p-1 rounded transition-colors">
              <RefreshCw className="w-3.5 h-3.5"/>
            </button>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">
              {[1,2,3].map(i=><div key={i} className="h-14 bg-[hsl(var(--bg-hover))] rounded animate-pulse"/>)}
            </div>
          ) : plans.length === 0 ? (
            <div className="p-8 text-center">
              <ClipboardList className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--text-muted))]"/>
              <p className="text-xs text-[hsl(var(--text-muted))]">Chưa có kế hoạch nào.<br/>Hãy chạy NSGA-II trước.</p>
            </div>
          ) : (
            <div className="divide-y divide-[hsl(var(--border-sub))]">
              {plans.map(p=>{
                const s = STATUS_PLAN[p.status]??{label:p.status,cls:""};
                return (
                  <button key={p.id} onClick={()=>setSelected(p)}
                    className={`w-full text-left px-4 py-3.5 transition-colors hover:bg-[hsl(var(--bg-hover))]
                      ${selected?.id===p.id?"bg-[hsl(var(--bg-hover))]":""}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[hsl(var(--text))]">
                        {new Date(p.date).toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric"})}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
                    </div>
                    <div className="text-[11px] text-[hsl(var(--text-muted))]">
                      {p.routes.length} xe · {p.routes.reduce((s,r)=>s+r.stops.length,0)} điểm giao
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail */}
        {!selected ? (
          <div className={`${C.card} flex flex-col items-center justify-center py-20`}>
            <ClipboardList className="w-10 h-10 text-[hsl(var(--text-muted))] mb-3"/>
            <p className="text-sm text-[hsl(var(--text-muted))]">Chọn kế hoạch để xem chi tiết</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className={`${C.card} px-5 py-4`}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-[hsl(var(--text))]">
                    Kế hoạch {new Date(selected.date).toLocaleDateString("vi-VN",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}
                  </h2>
                  <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
                    Tạo lúc {new Date(selected.createdAt).toLocaleTimeString("vi-VN")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-[hsl(var(--bg-hover))] p-1 rounded-[var(--radius)] mr-2">
                    <button onClick={()=>setViewMode("list")} className={`px-3 py-1.5 text-xs font-semibold rounded ${viewMode==="list"?"bg-[hsl(var(--bg-card))] shadow-sm text-[hsl(var(--text))]":"text-[hsl(var(--text-muted))]"}`}>Lịch trình</button>
                    <button onClick={()=>setViewMode("gantt")} className={`px-3 py-1.5 text-xs font-semibold rounded ${viewMode==="gantt"?"bg-[hsl(var(--bg-card))] shadow-sm text-[hsl(var(--text))]":"text-[hsl(var(--text-muted))]"}`}>Gantt Chart</button>
                  </div>
                  {selected.status === "READY" && (
                    <button onClick={handleDispatch} disabled={dispatching}
                      className="btn-primary text-xs">
                      {dispatching ? "Đang điều phối..." : <><ChevronRight className="w-3.5 h-3.5"/>Điều phối ngay</>}
                    </button>
                  )}
                  <button onClick={handlePrint} className="btn-secondary text-xs">
                    <Printer className="w-3.5 h-3.5"/>In lệnh giao hàng
                  </button>
                </div>
              </div>

              {/* KPI row */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                {[
                  {label:"Tổng điểm giao", value:totalStops,              unit:"điểm"},
                  {label:"Quãng đường",    value:totalKm.toFixed(1),      unit:"km"},
                  {label:"CO₂ phát thải", value:totalCo2.toFixed(2),     unit:"kg"},
                  {label:"Chi phí ước tính",value:`$${totalCost.toFixed(0)}`,unit:""},
                ].map(s=>(
                  <div key={s.label} className="p-3 bg-[hsl(var(--bg-hover))] rounded-[var(--radius)]">
                    <div className="text-[10px] text-[hsl(var(--text-muted))] uppercase tracking-wide">{s.label}</div>
                    <div className="text-lg font-bold text-[hsl(var(--text))] mt-0.5">{s.value} <span className="text-xs font-normal text-[hsl(var(--text-muted))]">{s.unit}</span></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Routes or Gantt */}
            {viewMode === "gantt" ? (
              <div className={`${C.card} p-5 overflow-x-auto`}>
                <div className="min-w-[800px]">
                  {/* Axis */}
                  {(()=>{
                    let minTime = 360;
                    let maxTime = 720;
                    selected.routes.forEach(r => r.stops.forEach(s => { if (s.departureEst > maxTime) maxTime = s.departureEst; }));
                    const totalMins = maxTime - minTime + 60;
                    return (
                      <>
                        <div className="flex items-center text-[10px] font-semibold text-[hsl(var(--text-muted))] border-b border-[hsl(var(--border))] pb-2 mb-4 relative" style={{ marginLeft: 90 }}>
                          {Array.from({length: Math.ceil(totalMins/60)+1}).map((_, i) => {
                            const m = minTime + i * 60;
                            return <div key={i} className="absolute -translate-x-1/2" style={{ left: `${(m - minTime)/totalMins * 100}%` }}>{minToTime(m)}</div>;
                          })}
                        </div>
                        <div className="space-y-4">
                          {selected.routes.map((route, i) => (
                            <div key={route.id} className="flex items-center gap-4 relative h-6">
                              <div className="w-[74px] text-xs font-semibold text-[hsl(var(--text))] shrink-0 truncate text-right">{route.vehicle.plate}</div>
                              <div className="flex-1 h-full bg-white/5 rounded relative">
                                {/* Driving & Service Blocks */}
                                {route.stops.map((stop, si) => {
                                  const prevDep = si === 0 ? minTime : route.stops[si-1].departureEst;
                                  const driveLeft = (prevDep - minTime) / totalMins * 100;
                                  const driveWidth = (stop.arrivalEst - prevDep) / totalMins * 100;
                                  const servLeft = (stop.arrivalEst - minTime) / totalMins * 100;
                                  const servWidth = (stop.departureEst - stop.arrivalEst) / totalMins * 100;
                                  return (
                                    <div key={stop.id}>
                                      {/* Drive line */}
                                      <div className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-[hsl(var(--text-muted))] opacity-50" 
                                        style={{ left: `${driveLeft}%`, width: `${driveWidth}%` }} title={`Di chuyển: ${stop.arrivalEst - prevDep} phút`} />
                                      <div className="absolute top-0 bottom-0 rounded shadow-sm cursor-pointer hover:scale-y-110 transition-transform flex items-center justify-center overflow-hidden" 
                                        style={{ left: `${servLeft}%`, width: `${Math.max(1, servWidth)}%`, background: COLORS[i%COLORS.length] }} 
                                        title={`${stop.order.customerName}\nĐến: ${minToTime(stop.arrivalEst)} - Đi: ${minToTime(stop.departureEst)}`}>
                                      </div>
                                    </div>
                                  );
                                })}
                                {/* Return trip */}
                                {route.stops.length > 0 && (
                                  <div className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-[hsl(var(--text-muted))] opacity-50" 
                                    style={{ left: `${(route.stops[route.stops.length-1].departureEst - minTime) / totalMins * 100}%`, width: `${(route.stops[route.stops.length-1].departureEst + 60 - route.stops[route.stops.length-1].departureEst) / totalMins * 100}%` }} title="Về kho" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            ) : (
              selected.routes.map((route,i)=>(
                <div key={route.id} className={C.card}>
                  {/* Route header */}
                  <div className="px-5 py-3.5 flex items-center gap-3" style={{borderBottom:"1px solid hsl(var(--border))"}}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{background:COLORS[i%COLORS.length]}}>
                      <Truck className="w-4 h-4"/>
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-[hsl(var(--text))]">{route.vehicle.plate}</div>
                      <div className="text-[11px] text-[hsl(var(--text-muted))]">
                        {route.stops.length} điểm · {route.distance.toFixed(1)} km · {route.co2.toFixed(2)} kg CO₂ · ${route.cost.toFixed(0)}
                        {route.loadUsed>0 && ` · ${route.loadUsed.toFixed(1)} kg tải`}
                      </div>
                    </div>
                    <div className="ml-auto">
                      {route.feasible
                        ? <span className="flex items-center gap-1 text-[11px] text-[hsl(var(--green))]"><CheckCircle2 className="w-3.5 h-3.5"/>Khả thi</span>
                        : <span className="text-[11px] text-[hsl(var(--orange))]">⚠ Vi phạm ràng buộc</span>}
                    </div>
                  </div>

                  {/* Stop timeline */}
                  {route.stops.length === 0 ? (
                    <div className="px-5 py-4 text-xs text-[hsl(var(--text-muted))]">Xe này không có điểm giao.</div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-[2.75rem] top-0 bottom-0 w-px bg-[hsl(var(--border-sub))]" style={{top:16,bottom:16}}/>
                      <div className="divide-y divide-[hsl(var(--border-sub))]">
                        {route.stops.map((stop,si)=>(
                          <div key={stop.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-[hsl(var(--bg-hover))] transition-colors">
                            {/* Step number */}
                            <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shrink-0 z-10"
                              style={{
                                background:stop.status==="DELIVERED"?"hsl(var(--bg-card))":"hsl(var(--bg-hover))",
                                borderColor:stop.status==="DELIVERED"?COLORS[i%COLORS.length]:"hsl(var(--border))",
                                color:stop.status==="DELIVERED"?COLORS[i%COLORS.length]:"hsl(var(--text-muted))",
                              }}>
                              {si+1}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="text-sm font-medium text-[hsl(var(--text))]">{stop.order.customerName}</div>
                                  <div className="text-xs text-[hsl(var(--text-muted))] flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3 shrink-0"/>{stop.order.address}
                                  </div>
                                  {stop.order.phone && (
                                    <div className="text-[11px] text-[hsl(var(--text-muted))] mt-0.5">📞 {stop.order.phone}</div>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="flex items-center gap-1 text-xs text-[hsl(var(--text-sub))] justify-end">
                                    <Clock className="w-3 h-3"/>{minToTime(stop.arrivalEst)}
                                  </div>
                                  <div className="text-[10px] text-[hsl(var(--text-muted))] mt-0.5">
                                    {stop.order.demandKg} kg
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
