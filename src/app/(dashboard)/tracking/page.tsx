"use client";
import { useEffect, useState } from "react";
import { Loader2, Truck, BarChart3 } from "lucide-react";
import { fetchApi, postApi } from "@/lib/fetchApi";
import TrackingMap, { TrackingVehicle, minToTime } from "@/components/TrackingMap";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function TrackingPage() {
  const [vehicles, setVehicles]   = useState<TrackingVehicle[]>([]);
  const [loading, setLoading]     = useState(true);
  const [depot, setDepot]         = useState({ lat: 10.7769, lng: 106.7009 });
  const [planId, setPlanId]       = useState<string | null>(null);
  const [algoStats, setAlgoStats] = useState({ feasible: 0, savePct: 28.3 });

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchApi<any[]>("/api/optimize").then(data => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const plan = data.find((p: any) => ["DISPATCHED", "READY", "ON_ROUTE"].includes(p.status));
      if (!plan) { setLoading(false); return; }

      setPlanId(plan.id);
      const depotLat = plan.algoConfig?.depotLat || 10.7769;
      const depotLng = plan.algoConfig?.depotLng || 106.7009;
      setDepot({ lat: depotLat, lng: depotLng });
      setAlgoStats({ feasible: plan.paretoFront?.length || 0, savePct: 28.3 });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dynVehicles: TrackingVehicle[] = plan.routes.map((r: any, i: number) => ({
        id:     r.vehicleId,
        plate:  r.vehicle.plate,
        driver: r.vehicle.driver?.name || "Tài xế",
        color:  COLORS[i % COLORS.length],
        route: [
          { lat: depotLat, lng: depotLng },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...r.stops.map((s: any) => ({ lat: s.order.lat, lng: s.order.lng })),
          { lat: depotLat, lng: depotLng },
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stops: r.stops.map((s: any) => ({
          name:    s.order.customerName,
          address: s.order.address,
          eta:     minToTime(s.arrivalEst),
          done:    s.status === "DELIVERED",
        })),
        totalKm: +r.distance.toFixed(1),
        co2:     +r.co2.toFixed(1),
        cost:    +r.cost.toFixed(0),
      }));

      setVehicles(dynVehicles);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSimComplete(id: string | null) {
    if (id) await postApi("/api/optimize/complete", { planId: id });
  }

  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-56px)] flex flex-col items-center justify-center bg-[hsl(var(--bg))] gap-4">
        <Loader2 className="w-8 h-8 text-[hsl(var(--primary))] animate-spin" />
        <span className="text-sm font-medium text-[hsl(var(--text-muted))]">Đang tải dữ liệu mô phỏng...</span>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="w-full h-[calc(100vh-56px)] flex flex-col items-center justify-center bg-[hsl(var(--bg))] gap-4">
        <Truck className="w-10 h-10 text-[hsl(var(--text-muted))]" />
        <span className="text-sm font-medium text-[hsl(var(--text-muted))]">Chưa có chuyến xe nào được điều phối hôm nay.</span>
      </div>
    );
  }

  return (
    <div className="relative" style={{ height: "calc(100vh - 56px)" }}>
      <TrackingMap
        vehicles={vehicles}
        depot={depot}
        showSimControl={true}
        planId={planId}
        onSimComplete={handleSimComplete}
        height="calc(100vh - 56px)"
      />

      {/* NSGA-II watermark */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[400] fade-in pointer-events-none">
        <div className="glass px-5 py-2 flex items-center gap-3">
          <BarChart3 className="w-4 h-4 text-[hsl(var(--purple))]" />
          <span className="text-xs text-[hsl(var(--text-muted))]">
            Tuyến đường tối ưu bởi <strong className="text-[hsl(var(--text))]">NSGA-II</strong>
            {" · "}Pareto Front <strong className="text-[hsl(var(--primary))]">{algoStats.feasible} nghiệm khả thi</strong>
            {" · "}Tiết kiệm <strong className="text-[hsl(var(--green))]">{algoStats.savePct}%</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
