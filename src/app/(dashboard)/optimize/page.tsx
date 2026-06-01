"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap, Settings2, BarChart3, CheckCircle, AlertCircle,
  Play, Loader2, ChevronRight, Info, TrendingDown, Scale,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { postApi } from "@/lib/fetchApi";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ZAxis,
  ResponsiveContainer, LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import type { OptimizeRequest, OptimizeResponse, ParetoPointDTO, ConvergenceEntry } from "@/lib/types";
import { ENGINE_DEFAULTS, DEFAULT_DEPOT } from "@/lib/constants";

// ── UI Helpers ─────────────────────────────────────────────────────────────────

const ROUTE_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899"];

const AXIS_OPTIONS = {
  totalDistance: "Quãng đường (km)",
  totalCo2:      "CO₂ (kg)",
  totalCost:     "Chi phí ($)",
} as const;
type AxisKey = keyof typeof AXIS_OPTIONS;

const MODE_INFO = {
  nsga2: {
    title: "NSGA-II (Multi-Objective)",
    desc: "Tìm Pareto front — nhiều nghiệm đánh đổi giữa khoảng cách, CO₂ và chi phí. Phù hợp khi cần phân tích trade-off.",
    icon: Scale,
    color: "hsl(var(--primary))",
  },
  weighted: {
    title: "Weighted Sum (Single-Objective)",
    desc: "Scalarize 3 objectives thành 1 fitness theo trọng số. Nhanh hơn ~30%, trả về 1 nghiệm tối ưu duy nhất.",
    icon: TrendingDown,
    color: "hsl(var(--green))",
  },
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function OptimizePage() {
  const router = useRouter();
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);

  const [config, setConfig] = useState<OptimizeRequest>({
    date:           today,
    depotLat:       DEFAULT_DEPOT.lat,
    depotLng:       DEFAULT_DEPOT.lng,
    populationSize: ENGINE_DEFAULTS.populationSize,
    generations:    ENGINE_DEFAULTS.generations,
    mode:           "nsga2",
    w_dist:         ENGINE_DEFAULTS.w_dist,
    w_co2:          ENGINE_DEFAULTS.w_co2,
    w_cost:         ENGINE_DEFAULTS.w_cost,
  });

  const [running, setRunning]         = useState(false);
  const [jobProgress, setJobProgress] = useState({ pct: 0, message: "" });
  const [result, setResult]           = useState<OptimizeResponse | null>(null);
  const [selected, setSelected]       = useState<ParetoPointDTO | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [axisX, setAxisX]             = useState<AxisKey>("totalDistance");
  const [axisY, setAxisY]             = useState<AxisKey>("totalCo2");
  const [showConvergence, setShowConvergence] = useState(false);

  const setMode = (mode: "nsga2" | "weighted") =>
    setConfig((p) => ({ ...p, mode }));

  const setField = <K extends keyof OptimizeRequest>(key: K, value: OptimizeRequest[K]) =>
    setConfig((p) => ({ ...p, [key]: value }));

  // ── Run với Background Queue + SSE ─────────────────────────────────────────

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    setSelected(null);
    setJobProgress({ pct: 0, message: "Đang gửi yêu cầu tối ưu..." });

    try {
      // 1. Gửi POST → nhận 202 + jobId
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Lỗi khi tạo job tối ưu hóa");
      }

      const { jobId } = json.data as { jobId: string; planId: string };

      // 2. Mở SSE stream để nhận real-time progress
      const es = new EventSource(`/api/optimize/stream?jobId=${jobId}`);

      es.addEventListener("progress", (e) => {
        const { pct, message } = JSON.parse(e.data) as { pct: number; message: string };
        setJobProgress({ pct, message });
      });

      es.addEventListener("done", (e) => {
        es.close();
        const data = JSON.parse(e.data) as OptimizeResponse;
        setResult(data);
        if (data.pareto?.length) setSelected(data.pareto[0]);
        setRunning(false);
        toast("success", "Tối ưu hoàn tất", `${data.paretoSize} nghiệm · ${data.feasible} khả thi`);
      });

      es.addEventListener("error", (e) => {
        es.close();
        const data = JSON.parse((e as MessageEvent).data ?? "{}") as { message?: string };
        setRunning(false);
        toast("error", "Lỗi tối ưu", data.message ?? "Lỗi kết nối");
      });

      // Cleanup khi component unmount
      return () => es.close();

    } catch (err) {
      setRunning(false);
      toast("error", "Lỗi tối ưu", err instanceof Error ? err.message : "Lỗi kết nối");
    }
  };

  // ── Dispatch ───────────────────────────────────────────────────────────────

  const handleDispatch = async () => {
    if (!result) return;
    setDispatching(true);
    try {
      await postApi("/api/optimize/dispatch", { planId: result.planId });
      router.push("/dispatch");
    } finally {
      setDispatching(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const modeInfo = MODE_INFO[config.mode ?? "nsga2"];
  const ModeIcon = modeInfo.icon;

  return (
    <div className="p-6 w-full">
      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-4">

        {/* ── LEFT: Config Panel ────────────────────────────────────────────── */}
        <div className="space-y-3 self-start">

          {/* Config Card */}
          <div className="bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[hsl(var(--border))]">
              <Settings2 className="w-4 h-4 text-[hsl(var(--text-muted))]" />
              <span className="text-sm font-semibold text-[hsl(var(--text))]">Cấu hình</span>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--text-muted))] mb-1.5">
                Ngày giao hàng
              </label>
              <input
                type="date"
                value={config.date}
                onChange={(e) => setField("date", e.target.value)}
                className="input"
              />
            </div>

            {/* Depot coordinates */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--text-muted))] mb-1.5">Depot Lat</label>
                <input
                  type="number" step="0.001"
                  value={config.depotLat}
                  onChange={(e) => setField("depotLat", +e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--text-muted))] mb-1.5">Depot Lng</label>
                <input
                  type="number" step="0.001"
                  value={config.depotLng}
                  onChange={(e) => setField("depotLng", +e.target.value)}
                  className="input"
                />
              </div>
            </div>

            {/* Mode selector */}
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--text-muted))] mb-1.5">
                Chế độ thuật toán
              </label>
              <div className="flex rounded-[var(--radius)] overflow-hidden border border-[hsl(var(--border))]">
                {(["nsga2", "weighted"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                      config.mode === m
                        ? "bg-[hsl(var(--primary))] text-white"
                        : "text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))] bg-[hsl(var(--bg-hover))]"
                    }`}
                  >
                    {m === "nsga2" ? "NSGA-II" : "Weighted"}
                  </button>
                ))}
              </div>
            </div>

            {/* Population & Generations sliders */}
            {[
              { label: `Quần thể: ${config.populationSize}`, field: "populationSize" as const, min: 20, max: 200, step: 10 },
              { label: `Thế hệ: ${config.generations}`,      field: "generations"    as const, min: 50, max: 500, step: 10 },
            ].map((f) => (
              <div key={f.field}>
                <label className="block text-xs font-medium text-[hsl(var(--text-muted))] mb-1.5">{f.label}</label>
                <input
                  type="range" min={f.min} max={f.max} step={f.step}
                  value={config[f.field] as number}
                  onChange={(e) => setField(f.field, +e.target.value)}
                  className="w-full h-1.5 rounded-full accent-[hsl(var(--primary))]"
                />
                <div className="flex justify-between text-[10px] text-[hsl(var(--text-muted))] mt-0.5">
                  <span>{f.min}</span><span>{f.max}</span>
                </div>
              </div>
            ))}

            {/* Weights (chỉ hiện khi weighted mode) */}
            {config.mode === "weighted" && (
              <div className="space-y-2 pt-1 border-t border-[hsl(var(--border))]">
                <p className="text-xs font-medium text-[hsl(var(--text-muted))]">Trọng số mục tiêu</p>
                {[
                  { label: `Quãng đường: ${config.w_dist}`, field: "w_dist" as const },
                  { label: `CO₂: ${config.w_co2}`,          field: "w_co2"  as const },
                  { label: `Chi phí: ${config.w_cost}`,     field: "w_cost" as const },
                ].map((f) => (
                  <div key={f.field}>
                    <label className="block text-[11px] text-[hsl(var(--text-muted))] mb-1">{f.label}</label>
                    <input
                      type="range" min={0} max={1} step={0.05}
                      value={config[f.field] as number}
                      onChange={(e) => setField(f.field, +e.target.value)}
                      className="w-full h-1.5 rounded-full accent-[hsl(var(--green))]"
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleRun}
              disabled={running}
              className="w-full py-2.5 bg-[hsl(var(--primary))] text-white rounded-[var(--radius)] text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {running
                ? <><Loader2 className="w-4 h-4 animate-spin" />Đang chạy...</>
                : <><Play className="w-4 h-4" />Bắt đầu tối ưu</>
              }
            </button>
          </div>

          {/* Mode description card */}
          <div className="bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                style={{ background: `${modeInfo.color}22` }}>
                <ModeIcon className="w-3.5 h-3.5" style={{ color: modeInfo.color }} />
              </div>
              <div>
                <p className="text-xs font-semibold text-[hsl(var(--text))] mb-1">{modeInfo.title}</p>
                <p className="text-[11px] text-[hsl(var(--text-muted))] leading-relaxed">{modeInfo.desc}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Results ────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Empty state */}
          {!result && !running && (
            <div className="bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)] flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-12 h-12 rounded-full bg-[hsl(var(--primary-dim))] flex items-center justify-center">
                <Zap className="w-6 h-6 text-[hsl(var(--primary))]" />
              </div>
              <p className="text-sm text-[hsl(var(--text-muted))]">
                Cấu hình tham số và bấm <strong className="text-[hsl(var(--text))]">Bắt đầu tối ưu</strong>
              </p>
              <p className="text-xs text-[hsl(var(--text-muted))]">
                NSGA-II tìm Pareto front · Weighted tìm nghiệm tốt nhất theo trọng số
              </p>
            </div>
          )}

          {/* Running state — Real-time Progress */}
          {running && (
            <div className="bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)] flex flex-col items-center justify-center py-20 gap-5">
              <div className="relative">
                <Loader2 className="w-10 h-10 text-[hsl(var(--primary))] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-[hsl(var(--primary))]">
                    {jobProgress.pct}%
                  </span>
                </div>
              </div>
              <div className="text-center w-72">
                <p className="text-sm font-semibold text-[hsl(var(--text))]">
                  {config.mode === "nsga2" ? "NSGA-II đang tiến hóa..." : "Weighted GA đang tối ưu..."}
                </p>
                <p className="text-xs text-[hsl(var(--text-muted))] mt-1.5 min-h-[1.25rem]">
                  {jobProgress.message || `${config.generations} thế hệ · ${config.populationSize} cá thể`}
                </p>
              </div>
              {/* Progress Bar thật */}
              <div className="w-72 space-y-1.5">
                <div className="w-full h-2.5 bg-[hsl(var(--bg-hover))] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${jobProgress.pct}%`,
                      background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--purple)))",
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[hsl(var(--text-muted))]">
                  <span>Đang xử lý trong background...</span>
                  <span>{jobProgress.pct}%</span>
                </div>
              </div>
            </div>
          )}


          {/* Results */}
          {result && (
            <>
              {/* Summary pills */}
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  {
                    label: "Nghiệm Pareto",
                    value: result.paretoSize,
                    color: "text-[hsl(var(--text))]",
                    sub: config.mode === "weighted" ? "Weighted mode" : "NSGA-II",
                  },
                  {
                    label: "Khả thi",
                    value: result.feasible,
                    color: result.feasible > 0 ? "text-[hsl(var(--green))]" : "text-[hsl(var(--orange))]",
                    sub: result.feasible > 0 ? "Không vi phạm" : "Có vi phạm",
                  },
                  {
                    label: "Best fitness",
                    value: result.history.at(-1)?.bestFitness.toFixed(0) ?? "—",
                    color: "text-[hsl(var(--primary))]",
                    sub: `Gen ${result.history.length}`,
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)] px-4 py-3 flex flex-col"
                  >
                    <span className="text-[11px] text-[hsl(var(--text-muted))]">{s.label}</span>
                    <span className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</span>
                    <span className="text-[10px] text-[hsl(var(--text-muted))] mt-0.5">{s.sub}</span>
                  </div>
                ))}

                {/* Toggle convergence chart */}
                <button
                  onClick={() => setShowConvergence((v) => !v)}
                  className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs rounded-[var(--radius)] border border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))] hover:bg-[hsl(var(--bg-hover))] transition-colors"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  {showConvergence ? "Ẩn convergence" : "Xem convergence"}
                </button>
              </div>

              {/* Convergence Chart */}
              {showConvergence && result.history.length > 0 && (
                <div className="bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5">
                  <p className="text-xs font-semibold text-[hsl(var(--text))] mb-3">Đường cong hội tụ (fitness theo thế hệ)</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={result.history} margin={{ left: 0, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="gen"
                        tick={{ fill: "hsl(215 16% 45%)", fontSize: 10 }}
                        axisLine={false} tickLine={false}
                        label={{ value: "Thế hệ", fill: "hsl(215 16% 45%)", fontSize: 10, position: "insideBottomRight", offset: 0 }}
                      />
                      <YAxis
                        tick={{ fill: "hsl(215 16% 45%)", fontSize: 10 }}
                        axisLine={false} tickLine={false} width={60}
                        tickFormatter={(v) => v.toFixed(0)}
                      />
                      <Tooltip
                        contentStyle={{ background: "hsl(220 13% 9%)", border: "1px solid hsl(220 13% 18%)", borderRadius: 6, fontSize: 11 }}
                        formatter={(v: number) => [v.toFixed(1), "Fitness"]}
                      />
                      <Line
                        type="monotone" dataKey="bestFitness"
                        stroke="hsl(var(--primary))" strokeWidth={2}
                        dot={false} name="Best Fitness"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Pareto Scatter (chỉ hiện khi NSGA-II và có >1 nghiệm) */}
              {config.mode === "nsga2" && result.pareto.length > 1 && (
                <div className="bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)]">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--border))]">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[hsl(var(--text-muted))]" />
                      <span className="text-sm font-semibold text-[hsl(var(--text))]">Pareto Front</span>
                      <span className="text-xs text-[hsl(var(--text-muted))]">— click điểm để xem chi tiết</span>
                    </div>
                    {/* Axis toggles */}
                    <div className="flex items-center gap-3 text-[11px]">
                      <div className="flex items-center gap-1">
                        <span className="text-[hsl(var(--text-muted))]">X:</span>
                        {(Object.keys(AXIS_OPTIONS) as AxisKey[]).map((k) => (
                          <button key={k} onClick={() => setAxisX(k)}
                            className={`px-2 py-0.5 rounded transition-colors ${
                              axisX === k
                                ? "bg-[hsl(var(--primary-dim))] text-[hsl(var(--primary))]"
                                : "text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))]"
                            }`}>
                            {AXIS_OPTIONS[k].split(" ")[0]}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[hsl(var(--text-muted))]">Y:</span>
                        {(Object.keys(AXIS_OPTIONS) as AxisKey[]).map((k) => (
                          <button key={k} onClick={() => setAxisY(k)}
                            className={`px-2 py-0.5 rounded transition-colors ${
                              axisY === k
                                ? "bg-[hsl(var(--primary-dim))] text-[hsl(var(--primary))]"
                                : "text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))]"
                            }`}>
                            {AXIS_OPTIONS[k].split(" ")[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <ResponsiveContainer width="100%" height={240}>
                      <ScatterChart>
                        <XAxis
                          dataKey="x" name={AXIS_OPTIONS[axisX]} type="number"
                          tick={{ fill: "hsl(215 16% 45%)", fontSize: 10 }}
                          axisLine={false} tickLine={false}
                          label={{ value: AXIS_OPTIONS[axisX], fill: "hsl(215 16% 45%)", fontSize: 10, position: "insideBottom", offset: -4 }}
                        />
                        <YAxis
                          dataKey="y" name={AXIS_OPTIONS[axisY]} type="number"
                          tick={{ fill: "hsl(215 16% 45%)", fontSize: 10 }}
                          axisLine={false} tickLine={false}
                          label={{ value: AXIS_OPTIONS[axisY], fill: "hsl(215 16% 45%)", fontSize: 10, angle: -90, position: "insideLeft" }}
                        />
                        <ZAxis range={[40, 40]} />
                        <Tooltip
                          contentStyle={{ background: "hsl(220 13% 9%)", border: "1px solid hsl(220 13% 18%)", borderRadius: 6, fontSize: 11 }}
                          formatter={(v: number, n: string) => [v.toFixed(2), n]}
                        />
                        <Scatter
                          data={result.pareto.map((p) => ({
                            x: p[axisX], y: p[axisY], feasible: p.feasible, _p: p,
                          }))}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          shape={(props: any) => {
                            const { cx, cy, payload } = props as {
                              cx: number; cy: number;
                              payload: { feasible: boolean; _p: ParetoPointDTO };
                            };
                            const isSelected = selected === payload._p;
                            return (
                              <circle
                                cx={cx} cy={cy}
                                r={isSelected ? 8 : 5}
                                fill={payload.feasible ? "hsl(213,94%,58%)" : "hsl(0,72%,51%)"}
                                fillOpacity={0.85}
                                stroke={isSelected ? "white" : "none"}
                                strokeWidth={2}
                                style={{ cursor: "pointer", transition: "r 0.15s" }}
                                onClick={() => setSelected(payload._p)}
                              />
                            );
                          }}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-4 justify-center text-xs text-[hsl(var(--text-muted))] mt-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[hsl(var(--primary))] inline-block" />
                        Khả thi
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[hsl(var(--red))] inline-block" />
                        Vi phạm
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Info className="w-3 h-3" />
                        Click điểm để xem chi tiết tuyến
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected solution detail */}
              {selected && (
                <div className="bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)]">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--border))]">
                    <div className="flex items-center gap-2">
                      {selected.feasible
                        ? <CheckCircle className="w-4 h-4 text-[hsl(var(--green))]" />
                        : <AlertCircle className="w-4 h-4 text-[hsl(var(--orange))]" />}
                      <span className="text-sm font-semibold text-[hsl(var(--text))]">
                        {config.mode === "nsga2" ? "Phương án đang xem" : "Nghiệm tối ưu"}
                      </span>
                    </div>
                    <button
                      disabled={dispatching || !result}
                      onClick={handleDispatch}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--primary))] text-white rounded-[var(--radius)] text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {dispatching
                        ? <><Loader2 className="w-3 h-3 animate-spin" />Đang điều phối...</>
                        : <><ChevronRight className="w-3 h-3" />Chốt phương án</>
                      }
                    </button>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Quãng đường", value: `${selected.totalDistance.toFixed(1)} km` },
                        { label: "CO₂",          value: `${selected.totalCo2.toFixed(2)} kg` },
                        { label: "Chi phí",      value: `$${selected.totalCost.toFixed(0)}` },
                      ].map((s) => (
                        <div key={s.label} className="p-3 bg-[hsl(var(--bg-hover))] rounded-[var(--radius)]">
                          <div className="text-xs text-[hsl(var(--text-muted))]">{s.label}</div>
                          <div className="text-base font-bold text-[hsl(var(--text))] mt-0.5">{s.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Routes breakdown */}
                    <div className="space-y-1.5">
                      {selected.routes
                        .filter((r) => r.customerSequence.length > 0)
                        .map((r, i) => (
                          <div
                            key={r.vehicleId}
                            className="flex items-center gap-3 px-3 py-2.5 bg-[hsl(var(--bg-hover))] rounded-[var(--radius)] text-xs"
                          >
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0"
                              style={{ background: ROUTE_COLORS[i % ROUTE_COLORS.length] }}
                            >
                              {i + 1}
                            </div>
                            <span className="font-semibold text-[hsl(var(--text))]">
                              {r.customerSequence.length} điểm
                            </span>
                            <span className="text-[hsl(var(--text-muted))]">
                              {r.distance.toFixed(1)} km ·{" "}
                              {r.co2.toFixed(2)} kg CO₂ ·{" "}
                              ${r.cost.toFixed(0)}
                            </span>
                            <div className="ml-auto shrink-0">
                              {r.feasible
                                ? <span className="text-[hsl(var(--green))] text-[10px] font-medium">✓ OK</span>
                                : <span className="text-[hsl(var(--orange))] text-[10px] font-medium">⚠ Vi phạm</span>
                              }
                            </div>
                          </div>
                        ))
                      }
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
