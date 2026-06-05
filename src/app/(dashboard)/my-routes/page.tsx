"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Truck, Package, MapPin, Clock, CheckCircle2, 
  Circle, Phone, Navigation2, Loader2, AlertCircle
} from "lucide-react";

interface Stop {
  id: string;
  position: number;
  arrivalEst: number;
  status: string;
  order: {
    id: string;
    customerName: string;
    address: string;
    phone?: string;
    demandKg: number;
  };
}

interface MyRoute {
  id: string;
  distance: number;
  cost: number;
  co2: number;
  loadUsed: number;
  vehicle: { plate: string; name: string };
  stops: Stop[];
}

function minToTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING:   { label: "Chưa giao", cls: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" },
    ARRIVED:   { label: "Đã đến",   cls: "bg-blue-500/20  text-blue-400  border border-blue-500/30"   },
    DELIVERED: { label: "Đã giao",  cls: "bg-green-500/20 text-green-400 border border-green-500/30"  },
    FAILED:    { label: "Thất bại", cls: "bg-red-500/20   text-red-400   border border-red-500/30"    },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-500/20 text-gray-400" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

export default function MyRoutesPage() {
  const { data: session } = useSession();
  const [routes, setRoutes] = useState<MyRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/my-routes")
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setRoutes(data.routes ?? []);
      })
      .catch(() => setError("Không thể tải dữ liệu. Vui lòng thử lại."))
      .finally(() => setLoading(false));
  }, []);

  const totalStops     = routes.reduce((s, r) => s + r.stops.length, 0);
  const deliveredStops = routes.reduce((s, r) => s + r.stops.filter(st => st.status === "DELIVERED").length, 0);
  const totalKm        = routes.reduce((s, r) => s + r.distance, 0);

  return (
    <div className="min-h-screen bg-[hsl(220_14%_8%)] text-white px-4 py-6 space-y-6">
      {/* Header */}
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

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Đang tải chuyến hàng...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Không có chuyến */}
      {!loading && !error && routes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
          <Package className="w-12 h-12 opacity-40" />
          <p className="text-lg font-medium">Chưa có chuyến nào được giao</p>
          <p className="text-sm">Điều phối viên sẽ giao chuyến cho bạn sau khi tối ưu lộ trình.</p>
        </div>
      )}

      {/* Danh sách chuyến */}
      {routes.map((route, ri) => (
        <div
          key={route.id}
          className="bg-[hsl(220_14%_14%)] rounded-2xl border border-[hsl(220_14%_20%)] overflow-hidden"
        >
          {/* Route header */}
          <div className="p-4 border-b border-[hsl(220_14%_20%)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/20">
                <Truck className="w-4 h-4 text-blue-400" />
              </div>
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

          {/* Stop list */}
          <div className="p-4 space-y-3">
            {route.stops
              .sort((a, b) => a.position - b.position)
              .map((stop, si) => (
                <div key={stop.id} className="flex gap-3">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                      ${stop.status === "DELIVERED" ? "bg-green-500/20 text-green-400 border border-green-500/40"
                       : stop.status === "FAILED"    ? "bg-red-500/20   text-red-400   border border-red-500/40"
                       :                              "bg-gray-500/20   text-gray-400  border border-gray-500/40"}`}>
                      {si + 1}
                    </div>
                    {si < route.stops.length - 1 && (
                      <div className="w-px flex-1 bg-[hsl(220_14%_22%)] mt-1" />
                    )}
                  </div>

                  {/* Stop info */}
                  <div className="flex-1 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{stop.order.customerName}</p>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {stop.order.address}
                        </p>
                        {stop.order.phone && (
                          <a
                            href={`tel:${stop.order.phone}`}
                            className="text-xs text-blue-400 mt-1 flex items-center gap-1 hover:text-blue-300"
                          >
                            <Phone className="w-3 h-3" />
                            {stop.order.phone}
                          </a>
                        )}
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {stop.order.demandKg} kg
                          <span className="mx-1">·</span>
                          <Clock className="w-3 h-3" />
                          ETA {minToTime(stop.arrivalEst)}
                        </p>
                      </div>
                      <StatusBadge status={stop.status} />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
