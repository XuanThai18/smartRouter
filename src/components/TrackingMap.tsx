"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Truck, CheckCircle2, Circle, Clock, Navigation2,
  Play, Square, Package, Leaf, Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface LatLng { lat: number; lng: number }
export interface TrackingStop { name: string; address: string; eta: string; done: boolean }
export interface TrackingVehicle {
  id: string; plate: string; driver: string; color: string;
  route: LatLng[]; stops: TrackingStop[];
  totalKm: number; co2: number; cost: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

export function getPosOnRoute(route: readonly LatLng[], t: number): LatLng {
  if (route.length === 0) return { lat: 10.7769, lng: 106.7009 };
  if (route.length === 1) return route[0];
  const scaled = t * (route.length - 1);
  const i = Math.min(Math.floor(scaled), route.length - 2);
  const f = scaled - i;
  return { lat: lerp(route[i].lat, route[i + 1].lat, f), lng: lerp(route[i].lng, route[i + 1].lng, f) };
}

export function minToTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function truckSvg(color: string, label: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="19" fill="${color}" stroke="white" stroke-width="2.5" filter="drop-shadow(0 2px 6px rgba(0,0,0,.6))"/>
      <text x="22" y="27" text-anchor="middle" fill="white" font-size="14" font-weight="700" font-family="Inter,sans-serif">${label}</text>
    </svg>`
  )}`;
}

function stopSvg(color: string, done: boolean) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6.5" fill="${done ? color : "#1d2c3d"}" stroke="${color}" stroke-width="2"/>
      ${done ? `<path d="M5 8l2 2 4-4" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
    </svg>`
  )}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface TrackingMapProps {
  vehicles: TrackingVehicle[];
  depot: LatLng;
  /** Nếu truyền vào, chỉ chọn xe này từ đầu và ẩn bộ chọn xe */
  lockedVehicleId?: string;
  /** Hiển thị hay ẩn nút mô phỏng */
  showSimControl?: boolean;
  /** Chiều cao bản đồ, mặc định 100% viewport - header */
  height?: string;
  /** Gọi khi simulation hoàn tất tất cả xe */
  onSimComplete?: (planId: string | null) => void;
  planId?: string | null;
}

export default function TrackingMap({
  vehicles,
  depot,
  lockedVehicleId,
  showSimControl = true,
  height = "calc(100vh - 56px)",
  onSimComplete,
  planId,
}: TrackingMapProps) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInst     = useRef<import("leaflet").Map | null>(null);
  const vMarkers    = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const routeLayers = useRef<import("leaflet").Layer[]>([]);
  const intvRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const [progress, setProgress] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [simRunning, setSimRunning] = useState(false);
  const [time, setTime] = useState("");

  // Init selected
  useEffect(() => {
    if (vehicles.length === 0) return;
    const initial = lockedVehicleId ?? vehicles[0].id;
    setSelected(initial);
    const p: Record<string, number> = {};
    vehicles.forEach(v => (p[v.id] = 0));
    setProgress(p);
  }, [vehicles, lockedVehicleId]);

  // Live clock
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Init Leaflet & draw routes
  useEffect(() => {
    if (typeof window === "undefined" || vehicles.length === 0) return;

    import("leaflet").then(L => {
      const container = mapRef.current;
      if (!container) return;

      // Khởi tạo map một lần
      let map = mapInst.current;
      if (!map) {
        if ((container as any)._leaflet_id) return;
        map = L.map(container, {
          center: [depot.lat, depot.lng], zoom: 12,
          zoomControl: false, preferCanvas: true,
        });
        L.control.zoom({ position: "topright" }).addTo(map);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
        mapInst.current = map;
      }

      // Xóa layer cũ
      routeLayers.current.forEach(l => map!.removeLayer(l));
      routeLayers.current = [];
      vMarkers.current.forEach(m => m.remove());
      vMarkers.current.clear();

      // Depot marker
      const depotHtml = `<div style="width:30px;height:30px;background:#6366f1;border:2.5px solid white;border-radius:50% 50% 0 50%;transform:rotate(45deg);box-shadow:0 2px 8px rgba(0,0,0,.6)"></div>`;
      const dm = L.marker([depot.lat, depot.lng], {
        icon: L.divIcon({ html: `<div style="transform:rotate(-45deg);margin:-4px">${depotHtml}</div>`, className: "", iconSize: [30, 30], iconAnchor: [15, 28] }),
        zIndexOffset: 500,
      }).addTo(map!).bindPopup("<b style='color:#fff'>🏭 Kho Trung Tâm</b><br><span style='color:#94a3b8;font-size:11px'>Depot xuất phát</span>");
      routeLayers.current.push(dm);

      // Vẽ từng xe
      const visibleVehicles = lockedVehicleId ? vehicles.filter(v => v.id === lockedVehicleId) : vehicles;

      visibleVehicles.forEach(v => {
        const pathLine = L.polyline(v.route.map(p => [p.lat, p.lng] as [number, number]), {
          color: v.color, weight: 3, opacity: 0.55, dashArray: "8 5",
        }).addTo(map!);
        routeLayers.current.push(pathLine);

        const glowLine = L.polyline(v.route.map(p => [p.lat, p.lng] as [number, number]), {
          color: v.color, weight: 8, opacity: 0.1,
        }).addTo(map!);
        routeLayers.current.push(glowLine);

        v.stops.forEach((stop, i) => {
          const wp = v.route[i + 1] ?? v.route[0];
          const sm = L.marker([wp.lat, wp.lng], {
            icon: L.divIcon({ html: `<img src="${stopSvg(v.color, stop.done)}" width="16" height="16"/>`, className: "", iconSize: [16, 16], iconAnchor: [8, 8] }),
            zIndexOffset: 100,
          }).addTo(map!).bindPopup(
            `<b style='color:#fff'>${stop.name}</b><br><span style='color:#94a3b8;font-size:11px'>${stop.address}</span><br><span style='color:${v.color};font-size:11px'>ETA ${stop.eta}</span>`
          );
          routeLayers.current.push(sm);
        });

        const pos = getPosOnRoute(v.route, 0);
        const truckLabel = v.plate.split("-")[1] || v.id.slice(0, 3);
        const m = L.marker([pos.lat, pos.lng], {
          icon: L.divIcon({ html: `<img src="${truckSvg(v.color, truckLabel)}" width="44" height="44"/>`, className: "", iconSize: [44, 44], iconAnchor: [22, 22] }),
          zIndexOffset: 1000,
        }).addTo(map!);
        m.on("click", () => !lockedVehicleId && setSelected(v.id));
        vMarkers.current.set(v.id, m);
      });

      // invalidateSize để map vẽ đúng khi container vừa được mount hoặc resize
      setTimeout(() => map!.invalidateSize(), 100);

      // Fit bounds để hiển thị toàn bộ route
      const allPts = visibleVehicles.flatMap(v => v.route).map(p => [p.lat, p.lng] as [number, number]);
      if (allPts.length > 1) {
        setTimeout(() => map!.fitBounds(L.latLngBounds(allPts), { padding: [40, 40] }), 150);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, lockedVehicleId]);

  // Sync marker positions theo progress
  useEffect(() => {
    if (vMarkers.current.size === 0 || vehicles.length === 0) return;
    vehicles.forEach(v => {
      const m   = vMarkers.current.get(v.id);
      const pos = getPosOnRoute(v.route, progress[v.id] || 0);
      m?.setLatLng([pos.lat, pos.lng]);
    });
  }, [progress, vehicles]);

  // Pan to selected
  useEffect(() => {
    if (!mapInst.current || !selected || vehicles.length === 0) return;
    const v = vehicles.find(v => v.id === selected);
    if (!v) return;
    const pos = getPosOnRoute(v.route, progress[selected] || 0);
    mapInst.current.panTo([pos.lat, pos.lng], { animate: true, duration: 0.6 });
  }, [selected, progress, vehicles]);

  // Simulation
  const startSim = useCallback(() => {
    setSimRunning(true);
    intvRef.current = setInterval(() => {
      setProgress(prev => {
        const next = { ...prev };
        let any = false;
        let allDone = true;
        vehicles.forEach(v => {
          const cur = next[v.id] || 0;
          if (cur < 1) { next[v.id] = Math.min(1, cur + 0.005); any = true; }
          if ((next[v.id] || 0) < 1) allDone = false;
        });
        if (!any) {
          clearInterval(intvRef.current!);
          setSimRunning(false);
          if (allDone && planId && onSimComplete) onSimComplete(planId);
        }
        return next;
      });
    }, 80);
  }, [vehicles, planId, onSimComplete]);

  const stopSim = useCallback(() => {
    if (intvRef.current) clearInterval(intvRef.current);
    setSimRunning(false);
  }, []);

  useEffect(() => () => { if (intvRef.current) clearInterval(intvRef.current); }, []);

  // Derived state
  const sel     = vehicles.find(v => v.id === selected) || vehicles[0];
  const pos     = sel ? getPosOnRoute(sel.route, progress[selected || ""] || 0) : { lat: 0, lng: 0 };
  const pct     = Math.round((progress[selected || ""] || 0) * 100);
  const isDone  = (progress[selected || ""] || 0) >= 1;
  const totalDone = vehicles.reduce((a, v) => {
    const vp = progress[v.id] || 0;
    return a + v.stops.filter((s, i) => s.done || vp >= ((i + 1) / (v.stops.length + 1))).length;
  }, 0);
  const totalAll  = vehicles.reduce((a, v) => a + v.stops.length, 0);

  if (vehicles.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center bg-[hsl(var(--bg))] gap-4" style={{ height }}>
        <Truck className="w-10 h-10 text-[hsl(var(--text-muted))]" />
        <span className="text-sm font-medium text-[hsl(var(--text-muted))]">Chưa có chuyến xe nào được điều phối.</span>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* Top-left: Thống kê */}
      <div className="absolute top-4 left-4 z-[400] flex items-center gap-2 fade-in">
        <div className="glass px-4 py-2.5 flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-[hsl(var(--green))] pulse-ring" />
          <span className="font-mono text-sm font-semibold text-[hsl(var(--text))]" suppressHydrationWarning>
            {time || "--:--:--"}
          </span>
          <span className="text-xs text-[hsl(var(--text-muted))] pl-1">Live</span>
        </div>
        {[
          { label: `${totalDone}/${totalAll}`, sub: "Điểm giao", icon: Package,    col: "var(--primary)" },
          { label: `${vehicles.reduce((a, v) => a + v.totalKm, 0).toFixed(0)} km`, sub: "Tổng KM", icon: Navigation2, col: "var(--green)" },
          { label: `${vehicles.reduce((a, v) => a + v.co2, 0).toFixed(1)} kg`, sub: "CO₂", icon: Leaf, col: "var(--orange)" },
        ].map(s => (
          <div key={s.sub} className="glass px-4 py-2.5 flex items-center gap-2.5">
            <div style={{ color: `hsl(${s.col})` }}><s.icon className="w-3.5 h-3.5" /></div>
            <div>
              <div className="text-sm font-bold text-[hsl(var(--text))] leading-none">{s.label}</div>
              <div className="text-[10px] text-[hsl(var(--text-muted))] mt-0.5">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Top-right: Sim control */}
      {showSimControl && (
        <div className="absolute top-4 right-14 z-[400] fade-in">
          <button
            onClick={simRunning ? stopSim : startSim}
            className={`glass flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer
              ${simRunning ? "text-[hsl(var(--red))]" : "text-[hsl(var(--primary))]"}`}
          >
            {simRunning
              ? <><Square className="w-3.5 h-3.5" />Dừng mô phỏng</>
              : <><Play className="w-3.5 h-3.5" />Phát mô phỏng GPS</>}
          </button>
        </div>
      )}

      {/* Left panel: Chọn xe (ẩn nếu lockedVehicleId) */}
      {!lockedVehicleId && (
        <div className="absolute bottom-4 left-4 z-[400] w-[240px] glass overflow-hidden fade-in flex flex-col max-h-[calc(100vh-140px)]">
          <div className="px-4 py-2.5 shrink-0 flex items-center gap-2" style={{ borderBottom: "1px solid var(--glass-border)", backgroundColor: "rgba(0,0,0,0.2)" }}>
            <Truck className="w-3.5 h-3.5 text-[hsl(var(--text-muted))]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">
              Đội xe ({vehicles.length})
            </span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: "var(--glass-border)" }}>
            {vehicles.map(v => {
              const p    = Math.round((progress[v.id] || 0) * 100);
              const done = (progress[v.id] || 0) >= 1;
              return (
                <button key={v.id} onClick={() => setSelected(v.id)}
                  className={`w-full px-4 py-3 text-left transition-colors cursor-pointer ${selected === v.id ? "bg-white/5" : "hover:bg-white/3"}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: v.color, boxShadow: selected === v.id ? `0 0 6px ${v.color}` : undefined }} />
                      <span className="text-xs font-semibold text-[hsl(var(--text))]">{v.plate}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${done ? "bg-green-500/15 text-green-400" : "bg-blue-500/15 text-blue-400"}`}>
                      {done ? "Xong" : "Đang đi"}
                    </span>
                  </div>
                  <div className="text-[11px] text-[hsl(var(--text-muted))] mb-2">{v.driver}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, background: v.color }} />
                    </div>
                    <span className="text-[10px] text-[hsl(var(--text-muted))] w-7 text-right">{p}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Right panel: Chi tiết xe được chọn */}
      {sel && (
        <div className="absolute top-4 right-4 bottom-4 z-[400] w-[290px] glass flex flex-col overflow-hidden fade-in" style={{ marginTop: 52 }}>
          <div className="px-4 py-3.5 shrink-0" style={{ borderBottom: "1px solid var(--glass-border)" }}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-[hsl(var(--text))]">{sel.plate}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isDone ? "bg-green-500/15 text-green-400" : "bg-blue-500/15 text-blue-400"}`}>
                {isDone ? "✓ Hoàn thành" : "● Đang giao"}
              </span>
            </div>
            <div className="text-xs text-[hsl(var(--text-muted))]">{sel.driver}</div>
          </div>

          <div className="px-4 py-2.5 shrink-0 flex items-center gap-2" style={{ borderBottom: "1px solid var(--glass-border)" }}>
            <Navigation2 className="w-3.5 h-3.5 text-[hsl(var(--primary))] shrink-0" />
            <span className="font-mono text-[11px] text-[hsl(var(--text-sub))]">
              {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
            </span>
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[hsl(var(--green))] pulse-ring" />
          </div>

          <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--glass-border)" }}>
            <div className="flex justify-between text-[11px] mb-2">
              <span className="text-[hsl(var(--text-muted))]">Tiến độ</span>
              <span className="font-semibold text-[hsl(var(--text))]">
                {sel.stops.filter((s, i) => s.done || (progress[selected || ""] || 0) >= ((i + 1) / (sel.stops.length + 1))).length}/{sel.stops.length} điểm
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: sel.color }} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Km", value: `${sel.totalKm} km` },
                { label: "CO₂", value: `${sel.co2} kg` },
                { label: "Chi phí", value: `$${sel.cost}` },
              ].map(s => (
                <div key={s.label} className="rounded-[var(--radius)] p-2 text-center" style={{ background: "rgba(255,255,255,.04)" }}>
                  <div className="text-[10px] text-[hsl(var(--text-muted))]">{s.label}</div>
                  <div className="text-xs font-semibold text-[hsl(var(--text))] mt-0.5">{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 py-2 shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">Lịch trình giao hàng</span>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
            {sel.stops.map((stop, i) => {
              const stopDone = stop.done || (progress[selected || ""] || 0) >= ((i + 1) / (sel.stops.length + 1));
              return (
                <div key={i} className={`rounded-[var(--radius)] px-3 py-2.5 flex items-start gap-2.5 transition-colors ${stopDone ? "opacity-50" : "bg-white/4"}`}>
                  <div className="mt-0.5 shrink-0">
                    {stopDone ? <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--green))]" /> : <Circle className="w-3.5 h-3.5 text-[hsl(var(--border))]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-medium ${stopDone ? "line-through text-[hsl(var(--text-muted))]" : "text-[hsl(var(--text))]"}`}>
                      {stop.name}
                    </div>
                    <div className="text-[11px] text-[hsl(var(--text-muted))] truncate mt-0.5">{stop.address}</div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[hsl(var(--text-muted))] shrink-0 mt-0.5">
                    <Clock className="w-2.5 h-2.5" />{stop.eta}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend footer */}
          <div className="px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--glass-border)" }}>
            <div className="flex items-center gap-3 flex-wrap">
              {vehicles.map(v => (
                <button key={v.id} onClick={() => !lockedVehicleId && setSelected(v.id)}
                  className={`flex items-center gap-1.5 text-[10px] transition-colors ${lockedVehicleId ? "cursor-default" : "cursor-pointer hover:text-[hsl(var(--text))]"} text-[hsl(var(--text-muted))]`}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: v.color }} />
                  {v.plate.split("-")[1] || v.id.slice(0, 3)}
                </button>
              ))}
              <span className="flex items-center gap-1 text-[10px] text-[hsl(var(--text-muted))] ml-auto">
                <div className="w-2 h-2 rounded-full bg-[#6366f1]" />Depot
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
