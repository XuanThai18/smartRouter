"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Settings2, BarChart3, CheckCircle, AlertCircle, Play, Loader2, ChevronRight } from "lucide-react";
import { useToast } from "@/components/Toast";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ZAxis } from "recharts";

interface ParetoPoint {
  totalDistance: number; totalCo2: number; totalCost: number;
  totalViolations: number; feasible: boolean;
  routes: Array<{ vehicleId: string; customerSequence: string[]; distance: number; co2: number; cost: number; feasible: boolean }>;
}
interface OptResult {
  planId: string; paretoSize: number; feasible: number;
  pareto: ParetoPoint[]; history: Array<{ gen: number; bestFitness: number; feasibleCount: number }>;
}

const C = {
  card:  "bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)]",
  input: "w-full px-3 py-2 bg-[hsl(var(--bg-hover))] border border-[hsl(var(--border))] rounded-[var(--radius)] text-sm text-[hsl(var(--text))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]",
  label: "block text-xs font-medium text-[hsl(var(--text-muted))] mb-1.5",
};

const AXIS_LABELS = { totalDistance:"Quãng đường (km)", totalCo2:"CO₂ (kg)", totalCost:"Chi phí ($)" };
const ROUTE_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];

export default function OptimizePage() {
  const router = useRouter();
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0,10);
  const [config, setConfig] = useState({
    date: today, depotLat: 10.7769, depotLng: 106.7009,
    populationSize: 80, generations: 150,
    mode: "nsga2" as "nsga2"|"weighted",
    w_dist: 0.4, w_co2: 0.3, w_cost: 0.3,
  });
  const [running, setRunning]       = useState(false);
  const [result, setResult]         = useState<OptResult|null>(null);
  const [selected, setSelected]     = useState<ParetoPoint|null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [axisX, setAxisX] = useState<keyof typeof AXIS_LABELS>("totalDistance");
  const [axisY, setAxisY] = useState<keyof typeof AXIS_LABELS>("totalCo2");

  const handleRun = async () => {
    setRunning(true); setResult(null); setSelected(null);
    try {
      const res = await fetch("/api/optimize", {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(config),
      });
      if (!res.ok) {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          toast("error","Lỗi tối ưu", json.error || "Có lỗi xảy ra");
        } catch {
          toast("error","Lỗi máy chủ", `Mã lỗi: ${res.status}. Vui lòng thử lại.`);
          console.error("Optimize failed:", text);
        }
        return;
      }
      const data = await res.json();
      setResult(data);
      if (data.pareto?.length) setSelected(data.pareto[0]);
    } catch (err) {
      console.error(err);
      toast("error","Lỗi", "Không thể kết nối đến máy chủ");
    } finally { setRunning(false); }
  };

  return (
    <div className="p-6 w-full">
      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">

        {/* Left: Config */}
        <div className={`${C.card} p-5 space-y-4 self-start`}>
          <div className="flex items-center gap-2 pb-3" style={{borderBottom:"1px solid hsl(var(--border))"}}>
            <Settings2 className="w-4 h-4 text-[hsl(var(--text-muted))]" />
            <span className="text-sm font-semibold text-[hsl(var(--text))]">Cấu hình</span>
          </div>

          <div>
            <label className={C.label}>Ngày giao hàng</label>
            <input type="date" value={config.date}
              onChange={e => setConfig(p=>({...p,date:e.target.value}))} className={C.input} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div><label className={C.label}>Depot Lat</label>
              <input type="number" step="0.001" value={config.depotLat}
                onChange={e=>setConfig(p=>({...p,depotLat:+e.target.value}))} className={C.input} />
            </div>
            <div><label className={C.label}>Depot Lng</label>
              <input type="number" step="0.001" value={config.depotLng}
                onChange={e=>setConfig(p=>({...p,depotLng:+e.target.value}))} className={C.input} />
            </div>
          </div>

          {/* Mode toggle */}
          <div>
            <label className={C.label}>Chế độ</label>
            <div className="flex rounded-[var(--radius)] overflow-hidden border border-[hsl(var(--border))]">
              {(["nsga2","weighted"] as const).map(m => (
                <button key={m} onClick={()=>setConfig(p=>({...p,mode:m}))}
                  className={`flex-1 py-1.5 text-xs font-medium transition-colors
                    ${config.mode===m ? "bg-[hsl(var(--primary))] text-white" : "text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))] bg-[hsl(var(--bg-hover))]"}`}>
                  {m==="nsga2" ? "NSGA-II" : "Weighted"}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          {[
            { label:`Quần thể: ${config.populationSize}`, field:"populationSize", min:20, max:200, step:10 },
            { label:`Thế hệ: ${config.generations}`,      field:"generations",    min:50, max:500, step:10 },
          ].map(f => (
            <div key={f.field}>
              <label className={C.label}>{f.label}</label>
              <input type="range" min={f.min} max={f.max} step={f.step}
                value={(config as Record<string,unknown>)[f.field] as number}
                onChange={e=>setConfig(p=>({...p,[f.field]:+e.target.value}))}
                className="w-full h-1 rounded-full bg-[hsl(var(--bg-hover))] accent-[hsl(var(--primary))]" />
              <div className="flex justify-between text-[10px] text-[hsl(var(--text-muted))] mt-0.5">
                <span>{f.min}</span><span>{f.max}</span>
              </div>
            </div>
          ))}

          <button onClick={handleRun} disabled={running}
            className="w-full py-2.5 bg-[hsl(var(--primary))] text-white rounded-[var(--radius)] text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
            {running
              ? <><Loader2 className="w-4 h-4 animate-spin"/>Đang chạy...</>
              : <><Play className="w-4 h-4"/>Bắt đầu tối ưu</>}
          </button>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {!result && !running && (
            <div className={`${C.card} flex flex-col items-center justify-center py-20 gap-3`}>
              <div className="w-10 h-10 rounded-full bg-[hsl(var(--primary-dim))] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[hsl(var(--primary))]" />
              </div>
              <p className="text-sm text-[hsl(var(--text-muted))]">Cấu hình tham số và bấm <strong className="text-[hsl(var(--text))]">Bắt đầu tối ưu</strong></p>
            </div>
          )}

          {running && (
            <div className={`${C.card} flex flex-col items-center justify-center py-20 gap-4`}>
              <Loader2 className="w-8 h-8 text-[hsl(var(--primary))] animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-[hsl(var(--text))]">NSGA-II đang tiến hóa</p>
                <p className="text-xs text-[hsl(var(--text-muted))] mt-1">{config.generations} thế hệ · {config.populationSize} cá thể</p>
              </div>
              <div className="w-48 h-1 bg-[hsl(var(--bg-hover))] rounded-full overflow-hidden">
                <div className="h-full bg-[hsl(var(--primary))] rounded-full animate-pulse" style={{width:"60%"}} />
              </div>
            </div>
          )}

          {result && (
            <>
              {/* Summary pills */}
              <div className="flex items-center gap-3">
                {[
                  { label:"Nghiệm Pareto",   value:result.paretoSize, color:"text-[hsl(var(--text))]" },
                  { label:"Nghiệm khả thi",  value:result.feasible,   color:`text-[hsl(var(${result.feasible>0?"--green":"--orange"}))]` },
                  { label:"Best fitness",    value:result.history.at(-1)?.bestFitness.toFixed(0)??"—", color:"text-[hsl(var(--primary))]" },
                ].map(s => (
                  <div key={s.label} className={`${C.card} px-4 py-3 flex flex-col`}>
                    <span className="text-[11px] text-[hsl(var(--text-muted))]">{s.label}</span>
                    <span className={`text-xl font-semibold mt-0.5 ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Pareto scatter */}
              <div className={C.card}>
                <div className="flex items-center justify-between px-5 py-3.5" style={{borderBottom:"1px solid hsl(var(--border))"}}>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[hsl(var(--text-muted))]" />
                    <span className="text-sm font-semibold text-[hsl(var(--text))]">Pareto Front</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {(Object.keys(AXIS_LABELS) as Array<keyof typeof AXIS_LABELS>).map(k => (
                      <button key={k} onClick={()=>setAxisX(k)}
                        className={`px-2 py-1 text-xs rounded-[var(--radius)] transition-colors
                          ${axisX===k ? "bg-[hsl(var(--primary-dim))] text-[hsl(var(--primary))]" : "text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))]"}`}>
                        {AXIS_LABELS[k].split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-5">
                  <ResponsiveContainer width="100%" height={240}>
                    <ScatterChart>
                      <XAxis dataKey="x" name={AXIS_LABELS[axisX]} type="number"
                        tick={{ fill:"hsl(215 16% 55%)", fontSize:10 }} axisLine={false} tickLine={false}
                        label={{ value:AXIS_LABELS[axisX], fill:"hsl(215 16% 55%)", fontSize:10, position:"insideBottom", offset:-4 }} />
                      <YAxis dataKey="y" name={AXIS_LABELS[axisY]} type="number"
                        tick={{ fill:"hsl(215 16% 55%)", fontSize:10 }} axisLine={false} tickLine={false} />
                      <ZAxis range={[40,40]} />
                      <Tooltip
                        contentStyle={{ background:"hsl(220 13% 9%)", border:"1px solid hsl(220 13% 18%)", borderRadius:6, fontSize:11 }}
                        formatter={(v:number, n:string) => [v.toFixed(1), n]} />
                      <Scatter
                        data={result.pareto.map(p=>({ x:p[axisX], y:p[axisY], feasible:p.feasible, ...p }))}
                        shape={(props: Record<string,unknown>) => {
                          const {cx,cy,payload} = props as {cx:number;cy:number;payload:{feasible:boolean}};
                          return <circle cx={cx} cy={cy} r={5}
                            fill={payload.feasible ? "hsl(213,94%,58%)" : "hsl(0,72%,51%)"}
                            fillOpacity={0.8} stroke="none" style={{cursor:"pointer"}}
                            onClick={()=>setSelected(result.pareto.find(p=>p[axisX]===(props.payload as ParetoPoint)[axisX])!)} />;
                        }}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-4 justify-center text-xs text-[hsl(var(--text-muted))] mt-1">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[hsl(var(--primary))] inline-block"/>Khả thi</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[hsl(var(--red))] inline-block"/>Vi phạm</span>
                  </div>
                </div>
              </div>

              {/* Selected solution */}
              {selected && (
                <div className={C.card}>
                  <div className="flex items-center justify-between px-5 py-3.5" style={{borderBottom:"1px solid hsl(var(--border))"}}>
                    <div className="flex items-center gap-2">
                      {selected.feasible
                        ? <CheckCircle className="w-4 h-4 text-[hsl(var(--green))]"/>
                        : <AlertCircle className="w-4 h-4 text-[hsl(var(--orange))]"/>}
                      <span className="text-sm font-semibold text-[hsl(var(--text))]">Phương án đang xem</span>
                    </div>
                    <button
                      disabled={dispatching || !result}
                      onClick={async () => {
                        if (!result) return;
                        setDispatching(true);
                        await fetch("/api/optimize/dispatch", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ planId: result.planId }),
                        });
                        router.push("/dispatch");
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[hsl(var(--primary))] text-white rounded-[var(--radius)] text-xs font-medium hover:opacity-90 disabled:opacity-50">
                      {dispatching ? "Đang điều phối..." : <><ChevronRight className="w-3 h-3"/>Chốt phương án</>}
                    </button>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label:"Quãng đường", value:`${selected.totalDistance.toFixed(1)} km` },
                        { label:"CO₂",         value:`${selected.totalCo2.toFixed(2)} kg` },
                        { label:"Chi phí",     value:`$${selected.totalCost.toFixed(0)}` },
                      ].map(s => (
                        <div key={s.label} className="p-3 bg-[hsl(var(--bg-hover))] rounded-[var(--radius)]">
                          <div className="text-xs text-[hsl(var(--text-muted))]">{s.label}</div>
                          <div className="text-base font-semibold text-[hsl(var(--text))] mt-0.5">{s.value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      {selected.routes.map((r,i) => (
                        <div key={r.vehicleId} className="flex items-center gap-3 px-3 py-2.5 bg-[hsl(var(--bg-hover))] rounded-[var(--radius)] text-xs">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0"
                            style={{background:ROUTE_COLORS[i%ROUTE_COLORS.length]}}>
                            {i+1}
                          </div>
                          <span className="font-medium text-[hsl(var(--text))]">{r.customerSequence.length} điểm</span>
                          <span className="text-[hsl(var(--text-muted))]">{r.distance.toFixed(1)} km · {r.co2.toFixed(2)} kg CO₂ · ${r.cost.toFixed(0)}</span>
                          <div className="ml-auto">
                            {r.feasible
                              ? <span className="text-[hsl(var(--green))] text-[10px]">✓ OK</span>
                              : <span className="text-[hsl(var(--orange))] text-[10px]">⚠ Vi phạm</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
