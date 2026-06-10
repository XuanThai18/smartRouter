"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Truck, Package, Loader2, AlertCircle, Map as MapIcon, List } from "lucide-react";
import TrackingMap, { TrackingVehicle, TrackingStop, minToTime } from "@/components/TrackingMap";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface ApiStop {
  id: string; position: number; arrivalEst: number; status: string;
  order: { id: string; customerName: string; address: string; phone?: string; demandKg: number; lat: number; lng: number };
}
interface ApiRoute {
  id: string; distance: number; cost: number; co2: number; loadUsed: number;
  vehicle: { plate: string; name: string };
  stops: ApiStop[];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING:   { label: "Chưa giao", cls: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" },
    ARRIVED:   { label: "Đã đến",   cls: "bg-blue-500/20  text-blue-400  border border-blue-500/30"   },
    DELIVERED: { label: "Đã giao",  cls: "bg-green-500/20 text-green-400 border border-green-500/30"  },
    FAILED:    { label: "Thất bại", cls: "bg-red-500/20   text-red-400   border border-red-500/30"    },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-500/20 text-gray-400" };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
const DEPOT  = { lat: 10.7769, lng: 106.7009 };

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function MyRoutesPage() {
  const { data: session } = useSession();
  const [apiRoutes, setApiRoutes] = useState<ApiRoute[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [tab, setTab]             = useState<"map" | "list">("map");

  useEffect(() => {
    fetch("/api/my-routes")
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setApiRoutes(data.routes ?? []);
      })
      .catch(() => setError("Không thể tải dữ liệu. Vui lòng thử lại."))
      .finally(() => setLoading(false));
  }, []);

  // Chuyển ApiRoute → TrackingVehicle để feed vào TrackingMap
  const trackingVehicles: TrackingVehicle[] = apiRoutes.map((r, i) => {
    const sorted: ApiStop[] = [...r.stops].sort((a, b) => a.position - b.position);
    const stops: TrackingStop[] = sorted.map(s => ({
      name:    s.order.customerName,
      address: s.order.address,
      eta:     minToTime(s.arrivalEst),
      done:    s.status === "DELIVERED",
    }));
    const route = [
      DEPOT,
      ...sorted.map(s => ({ lat: s.order.lat, lng: s.order.lng })),
      DEPOT,
    ];
    return {
      id:       r.id,
      plate:    r.vehicle.plate,
      driver:   session?.user?.name ?? "Tài xế",
      color:    COLORS[i % COLORS.length],
      route,
      stops,
      totalKm: +r.distance.toFixed(1),
      co2:     +r.co2.toFixed(2),
      cost:    +r.cost.toFixed(0),
    };
  });

  const totalStops     = apiRoutes.reduce((s, r) => s + r.stops.length, 0);
  const deliveredStops = apiRoutes.reduce((s, r) => s + r.stops.filter(st => st.status === "DELIVERED").length, 0);
  const totalKm        = apiRoutes.reduce((s, r) => s + r.distance, 0);

  return (
    <div className="min-h-screen bg-[hsl(220_14%_8%)] text-white flex flex-col">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 space-y-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/20">
            <Truck className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Chuyến giao hàng của tôi</h1>
            <p className="text-sm text-gray-400">
              Xin chào, <span className="text-white font-medium">{session?.user?.name}</span>
            </p>
          </div>
        </div>

        {/* KPI mini */}
        {!loading && !error && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[hsl(220_14%_14%)] rounded-xl p-3 text-center border border-[hsl(220_14%_20%)]">
              <div className="text-2xl font-bold text-blue-400">{totalStops}</div>
              <div className="text-xs text-gray-400 mt-1">Điểm giao</div>
            </div>
            <div className="bg-[hsl(220_14%_14%)] rounded-xl p-3 text-center border border-[hsl(220_14%_20%)]">
              <div className="text-2xl font-bold text-green-400">{deliveredStops}</div>
              <div className="text-xs text-gray-400 mt-1">Đã giao</div>
            </div>
            <div className="bg-[hsl(220_14%_14%)] rounded-xl p-3 text-center border border-[hsl(220_14%_20%)]">
              <div className="text-2xl font-bold text-yellow-400">{totalKm.toFixed(1)}</div>
              <div className="text-xs text-gray-400 mt-1">km hôm nay</div>
            </div>
          </div>
        )}

        {/* Tab switcher */}
        {!loading && !error && apiRoutes.length > 0 && (
          <div className="flex gap-2 p-1 bg-[hsl(220_14%_12%)] rounded-xl border border-[hsl(220_14%_20%)]">
            <button
              onClick={() => setTab("map")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === "map" ? "bg-blue-500/20 text-blue-400" : "text-gray-400 hover:text-white"
              }`}
            >
              <MapIcon className="w-4 h-4" /> Bản đồ lộ trình
            </button>
            <button
              onClick={() => setTab("list")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === "list" ? "bg-blue-500/20 text-blue-400" : "text-gray-400 hover:text-white"
              }`}
            >
              <List className="w-4 h-4" /> Danh sách điểm dừng
            </button>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Đang tải chuyến hàng...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Không có chuyến */}
      {!loading && !error && apiRoutes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
          <Package className="w-12 h-12 opacity-40" />
          <p className="text-lg font-medium">Chưa có chuyến nào được giao</p>
          <p className="text-sm text-center px-8">Điều phối viên sẽ giao chuyến sau khi tối ưu lộ trình.</p>
        </div>
      )}

      {/* MAP TAB — Dùng chung TrackingMap với lockedVehicleId = xe của tài xế */}
      {!loading && !error && apiRoutes.length > 0 && tab === "map" && (
        <div style={{ height: "calc(100vh - 260px)", minHeight: 400, position: "relative" }}>
          <TrackingMap
            vehicles={trackingVehicles}
            depot={DEPOT}
            lockedVehicleId={trackingVehicles.length === 1 ? trackingVehicles[0].id : undefined}
            showSimControl={false}
            height="100%"
          />
        </div>
      )}

      {/* LIST TAB */}
      {!loading && !error && tab === "list" && (
        <div className="px-4 pb-6 space-y-4">
          {apiRoutes.map(route => {
            const sorted = [...route.stops].sort((a, b) => a.position - b.position);
            return (
              <div key={route.id} className="bg-[hsl(220_14%_14%)] rounded-2xl border border-[hsl(220_14%_20%)] overflow-hidden">
                <div className="p-4 border-b border-[hsl(220_14%_20%)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/20"><Truck className="w-4 h-4 text-blue-400" /></div>
                    <div>
                      <p className="font-semibold">{route.vehicle.name}</p>
                      <p className="text-xs text-gray-400">{route.vehicle.plate}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-400 space-y-0.5">
                    <div>{route.distance.toFixed(1)} km</div>
                    <div>{route.loadUsed.toFixed(0)} kg hàng</div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {sorted.map((stop, si) => (
                    <div key={stop.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                          ${stop.status === "DELIVERED" ? "bg-green-500/20 text-green-400 border border-green-500/40"
                           : stop.status === "FAILED"   ? "bg-red-500/20   text-red-400   border border-red-500/40"
                           :                             "bg-gray-500/20   text-gray-400  border border-gray-500/40"}`}>
                          {si + 1}
                        </div>
                        {si < sorted.length - 1 && <div className="w-px flex-1 bg-[hsl(220_14%_22%)] mt-1" />}
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm">{stop.order.customerName}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{stop.order.address}</p>
                            {stop.order.phone && (
                              <a href={`tel:${stop.order.phone}`} className="text-xs text-blue-400 mt-1 block hover:text-blue-300">
                                📞 {stop.order.phone}
                              </a>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              📦 {stop.order.demandKg} kg · ⏱ ETA {minToTime(stop.arrivalEst)}
                            </p>
                          </div>
                          <StatusBadge status={stop.status} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
