"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Truck, Trash2, ChevronDown, Users, UserCheck, Phone, CreditCard, Link2, Link2Off, Search, Upload } from "lucide-react";
import { useToast } from "@/components/Toast";
import { fetchApi, postApi, putApi, deleteApi } from "@/lib/fetchApi";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Vehicle {
  id: string; plate: string; name: string; capacityKg: number;
  costPerKm: number; emissionPerKm: number; status: string;
  driver?: { id: string; name: string; phone: string } | null;
}

interface Driver {
  id: string; name: string; phone: string; licenseNo?: string | null;
  status: string; createdAt: string;
  vehicle: Array<{ id: string; plate: string; name: string; status: string }>;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const VEHICLE_STATUS_CYCLE: Record<string, string> = {
  AVAILABLE: "MAINTENANCE", MAINTENANCE: "AVAILABLE", ON_ROUTE: "ON_ROUTE",
};
const VEHICLE_STATUS_MAP: Record<string, { label: string; dot: string; cls: string }> = {
  AVAILABLE:   { label: "Sẵn sàng",  dot: "bg-[hsl(var(--green))]",   cls: "text-[hsl(var(--green))]"   },
  ON_ROUTE:    { label: "Đang chạy", dot: "bg-[hsl(var(--primary))]", cls: "text-[hsl(var(--primary))]" },
  MAINTENANCE: { label: "Bảo dưỡng", dot: "bg-[hsl(var(--orange))]",  cls: "text-[hsl(var(--orange))]"  },
};
const DRIVER_STATUS_MAP: Record<string, { label: string; dot: string; cls: string }> = {
  ACTIVE:    { label: "Đang làm việc", dot: "bg-[hsl(var(--green))]",   cls: "text-[hsl(var(--green))]"   },
  INACTIVE:  { label: "Ngừng hoạt động", dot: "bg-[hsl(var(--red))]",   cls: "text-[hsl(var(--red))]"     },
  ON_LEAVE:  { label: "Đang nghỉ phép",  dot: "bg-[hsl(var(--orange))]",cls: "text-[hsl(var(--orange))]"  },
};

const C = {
  card: "bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)]",
};

const EMPTY_VEHICLE_FORM = { plate: "", name: "", capacityKg: 500, costPerKm: 2.0, emissionPerKm: 0.21 };
const EMPTY_DRIVER_FORM  = { name: "", phone: "", licenseNo: "" };

// ── Component ─────────────────────────────────────────────────────────────────
export default function FleetPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"vehicles" | "drivers">("vehicles");

  // Vehicle state
  const [vehicles,        setVehicles]        = useState<Vehicle[]>([]);
  const [vehicleLoading,  setVehicleLoading]  = useState(true);
  const [showAddVehicle,  setShowAddVehicle]  = useState(false);
  const [statusDropdown,  setStatusDropdown]  = useState<string | null>(null);
  const [vehicleForm,     setVehicleForm]     = useState(EMPTY_VEHICLE_FORM);

  // Driver state
  const [drivers,         setDrivers]         = useState<Driver[]>([]);
  const [driverLoading,   setDriverLoading]   = useState(true);
  const [showAddDriver,   setShowAddDriver]   = useState(false);
  const [driverSearch,    setDriverSearch]    = useState("");
  const [driverForm,      setDriverForm]      = useState(EMPTY_DRIVER_FORM);
  const [assignDropdown,  setAssignDropdown]  = useState<string | null>(null);

  // ── Loaders ───────────────────────────────────────────────────────────────
  const loadVehicles = useCallback(async () => {
    setVehicleLoading(true);
    const data = await fetchApi<Vehicle[]>("/api/vehicles");
    setVehicles(data);
    setVehicleLoading(false);
  }, []);

  const loadDrivers = useCallback(async () => {
    setDriverLoading(true);
    const q = driverSearch ? `?q=${encodeURIComponent(driverSearch)}` : "";
    const data = await fetchApi<Driver[]>(`/api/drivers${q}`);
    setDrivers(data);
    setDriverLoading(false);
  }, [driverSearch]);

  useEffect(() => { loadVehicles(); }, [loadVehicles]);
  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  // ── Vehicle handlers ──────────────────────────────────────────────────────
  const handleAddVehicle = async () => {
    if (!vehicleForm.plate) { toast("warning", "Thiếu thông tin", "Vui lòng nhập biển số xe"); return; }
    try {
      await postApi("/api/vehicles", vehicleForm);
      toast("success", "Đã thêm xe", vehicleForm.plate);
      setShowAddVehicle(false);
      setVehicleForm(EMPTY_VEHICLE_FORM);
      loadVehicles();
    } catch (err) { toast("error", "Lỗi", err instanceof Error ? err.message : "Không thể thêm xe"); }
  };

  const handleVehicleStatusChange = async (v: Vehicle, next: string) => {
    await putApi(`/api/vehicles/${v.id}`, { status: next });
    setStatusDropdown(null);
    toast("success", "Cập nhật trạng thái", `${v.plate} → ${VEHICLE_STATUS_MAP[next]?.label}`);
    loadVehicles();
  };

  const handleDeleteVehicle = async (v: Vehicle) => {
    if (!confirm(`Xóa xe ${v.plate}?`)) return;
    try {
      await deleteApi(`/api/vehicles/${v.id}`);
      toast("success", "Đã xóa xe", v.plate);
      loadVehicles();
    } catch { toast("error", "Lỗi", "Không thể xóa xe đang được sử dụng"); }
  };

  // ── Driver handlers ───────────────────────────────────────────────────────
  const handleAddDriver = async () => {
    if (!driverForm.name || !driverForm.phone) {
      toast("warning", "Thiếu thông tin", "Vui lòng nhập tên và số điện thoại");
      return;
    }
    try {
      await postApi("/api/drivers", driverForm);
      toast("success", "Đã thêm tài xế", driverForm.name);
      setShowAddDriver(false);
      setDriverForm(EMPTY_DRIVER_FORM);
      loadDrivers();
    } catch (err) { toast("error", "Lỗi", err instanceof Error ? err.message : "Không thể thêm tài xế"); }
  };

  const handleDeleteDriver = async (d: Driver) => {
    if (!confirm(`Xóa tài xế ${d.name}? Tài xế sẽ bị bỏ gán khỏi xe.`)) return;
    try {
      await deleteApi(`/api/drivers/${d.id}`);
      toast("success", "Đã xóa tài xế", d.name);
      loadDrivers();
      loadVehicles();
    } catch { toast("error", "Lỗi", "Không thể xóa tài xế"); }
  };

  const handleAssignVehicle = async (driverId: string, vehicleId: string | null) => {
    try {
      await putApi(`/api/drivers/${driverId}`, { vehicleId });
      setAssignDropdown(null);
      toast("success", "Đã cập nhật phân công", vehicleId ? "Gán xe thành công" : "Đã bỏ gán xe");
      loadDrivers();
      loadVehicles();
    } catch { toast("error", "Lỗi", "Không thể cập nhật phân công xe"); }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const vStats = {
    total:     vehicles.length,
    available: vehicles.filter(v => v.status === "AVAILABLE").length,
    onRoute:   vehicles.filter(v => v.status === "ON_ROUTE").length,
    maint:     vehicles.filter(v => v.status === "MAINTENANCE").length,
  };
  const dStats = {
    total:    drivers.length,
    active:   drivers.filter(d => d.status === "ACTIVE").length,
    assigned: drivers.filter(d => d.vehicle.length > 0).length,
  };

  const filteredDrivers = drivers.filter(d =>
    !driverSearch ||
    d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
    d.phone.includes(driverSearch)
  );

  const availableVehicles = vehicles.filter(v => !v.driver);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-4 w-full">

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[hsl(var(--border))]">
        {([
          { key: "vehicles", label: "Phương tiện", icon: Truck,   count: vStats.total },
          { key: "drivers",  label: "Tài xế",       icon: Users,  count: dStats.total },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.key
                ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                : "border-transparent text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))]"
            }`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === t.key
                ? "bg-[hsl(var(--primary-dim))] text-[hsl(var(--primary))]"
                : "bg-[hsl(var(--bg-hover))] text-[hsl(var(--text-muted))]"
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── TAB: VEHICLES ──────────────────────────────────────────────────── */}
      {activeTab === "vehicles" && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: `${vStats.total} xe`,          dot: "" },
                { label: `${vStats.available} sẵn sàng`, dot: "bg-[hsl(var(--green))]" },
                { label: `${vStats.onRoute} đang chạy`,  dot: "bg-[hsl(var(--primary))]" },
                { label: `${vStats.maint} bảo dưỡng`,   dot: "bg-[hsl(var(--orange))]" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[hsl(var(--text-sub))] bg-[hsl(var(--bg-hover))] border border-[hsl(var(--border))] rounded-full">
                  {s.dot && <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />}
                  {s.label}
                </div>
              ))}
            </div>
            <button onClick={() => setShowAddVehicle(true)} className="btn-primary text-xs">
              <Plus className="w-3.5 h-3.5" />Thêm xe
            </button>
          </div>

          {/* Vehicles Table */}
          <div className={C.card}>
            <table className="data-table">
              <thead>
                <tr>{["Biển số", "Tên xe", "Tải trọng", "Chi phí/km", "CO₂/km", "Tài xế", "Trạng thái", ""].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {vehicleLoading ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}><div className="h-3.5 bg-[hsl(var(--bg-hover))] rounded animate-pulse w-3/4" /></td>
                  ))}</tr>
                )) : vehicles.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center">
                    <Truck className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--text-muted))]" />
                    <p className="text-sm text-[hsl(var(--text-muted))]">Chưa có xe nào. Thêm xe đầu tiên!</p>
                  </td></tr>
                ) : vehicles.map(v => {
                  const s = VEHICLE_STATUS_MAP[v.status] ?? { label: v.status, dot: "bg-gray-400", cls: "" };
                  return (
                    <tr key={v.id}>
                      <td className="font-semibold text-[hsl(var(--text))]">{v.plate}</td>
                      <td className="text-[hsl(var(--text-sub))]">{v.name}</td>
                      <td className="text-[hsl(var(--text-sub))]">{v.capacityKg} kg</td>
                      <td className="text-[hsl(var(--text-sub))]">${v.costPerKm}/km</td>
                      <td className="text-[hsl(var(--text-sub))]">{v.emissionPerKm} kg/km</td>
                      <td>
                        {v.driver
                          ? <div>
                              <div className="text-xs font-medium text-[hsl(var(--text))]">{v.driver.name}</div>
                              <div className="text-[11px] text-[hsl(var(--text-muted))]">{v.driver.phone}</div>
                            </div>
                          : <span className="text-[hsl(var(--text-muted))] text-xs">—</span>}
                      </td>
                      <td>
                        <div className="relative">
                          <button onClick={() => setStatusDropdown(statusDropdown === v.id ? null : v.id)}
                            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-[var(--radius)] hover:bg-[hsl(var(--bg-hover))] transition-colors">
                            <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                            <span className={s.cls}>{s.label}</span>
                            <ChevronDown className="w-3 h-3 text-[hsl(var(--text-muted))]" />
                          </button>
                          {statusDropdown === v.id && (
                            <div className="absolute top-full left-0 mt-1 z-50 bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)] shadow-xl py-1 min-w-[140px] fade-up">
                              {["AVAILABLE", "MAINTENANCE", "ON_ROUTE"].map(st => {
                                const ms = VEHICLE_STATUS_MAP[st];
                                return (
                                  <button key={st} onClick={() => handleVehicleStatusChange(v, st)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[hsl(var(--bg-hover))] transition-colors text-left">
                                    <div className={`w-1.5 h-1.5 rounded-full ${ms?.dot}`} />
                                    <span className={ms?.cls}>{ms?.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <button onClick={() => handleDeleteVehicle(v)}
                          className="p-1 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--red))] rounded transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── TAB: DRIVERS ───────────────────────────────────────────────────── */}
      {activeTab === "drivers" && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {[
                { label: `${dStats.total} tài xế`,       dot: "" },
                { label: `${dStats.active} đang làm`,     dot: "bg-[hsl(var(--green))]" },
                { label: `${dStats.assigned} đã gán xe`,  dot: "bg-[hsl(var(--primary))]" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[hsl(var(--text-sub))] bg-[hsl(var(--bg-hover))] border border-[hsl(var(--border))] rounded-full">
                  {s.dot && <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />}
                  {s.label}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--text-muted))]" />
                <input
                  value={driverSearch}
                  onChange={e => setDriverSearch(e.target.value)}
                  placeholder="Tìm tài xế..."
                  className="input !pl-9 !py-2 w-48 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
              <a href="/api/export/drivers" className="btn-secondary text-xs" download>
                <Upload className="w-3.5 h-3.5 rotate-180" /> Xuất Excel
              </a>
              <button onClick={() => setShowAddDriver(true)} className="btn-primary text-xs">
                <Plus className="w-3.5 h-3.5" />Thêm tài xế
              </button>
            </div>
          </div>
          </div>

          {/* Drivers Table */}
          <div className={C.card}>
            <table className="data-table">
              <thead>
                <tr>{["Tên tài xế", "Điện thoại", "Bằng lái", "Xe được gán", "Trạng thái", "Phân công", ""].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {driverLoading ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                    <td key={j}><div className="h-3.5 bg-[hsl(var(--bg-hover))] rounded animate-pulse w-3/4" /></td>
                  ))}</tr>
                )) : filteredDrivers.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center">
                    <Users className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--text-muted))]" />
                    <p className="text-sm text-[hsl(var(--text-muted))]">Chưa có tài xế nào. Thêm tài xế đầu tiên!</p>
                  </td></tr>
                ) : filteredDrivers.map(d => {
                  const s = DRIVER_STATUS_MAP[d.status] ?? { label: d.status, dot: "bg-gray-400", cls: "" };
                  const assignedVehicle = d.vehicle[0];
                  return (
                    <tr key={d.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[hsl(var(--primary-dim))] flex items-center justify-center text-[10px] font-bold text-[hsl(var(--primary))] shrink-0">
                            {d.name.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-[hsl(var(--text))]">{d.name}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 text-xs text-[hsl(var(--text-sub))]">
                          <Phone className="w-3 h-3" />{d.phone}
                        </div>
                      </td>
                      <td>
                        {d.licenseNo
                          ? <div className="flex items-center gap-1 text-xs text-[hsl(var(--text-sub))]">
                              <CreditCard className="w-3 h-3" />{d.licenseNo}
                            </div>
                          : <span className="text-[hsl(var(--text-muted))] text-xs">—</span>}
                      </td>
                      <td>
                        {assignedVehicle
                          ? <div>
                              <div className="text-xs font-semibold text-[hsl(var(--text))]">{assignedVehicle.plate}</div>
                              <div className="text-[11px] text-[hsl(var(--text-muted))]">{assignedVehicle.name}</div>
                            </div>
                          : <span className="text-xs text-[hsl(var(--text-muted))]">Chưa gán</span>}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-xs">
                          <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          <span className={s.cls}>{s.label}</span>
                        </div>
                      </td>
                      {/* Assign vehicle dropdown */}
                      <td>
                        <div className="relative">
                          <button onClick={() => setAssignDropdown(assignDropdown === d.id ? null : d.id)}
                            className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-[var(--radius)] hover:bg-[hsl(var(--bg-hover))] border border-[hsl(var(--border))] transition-colors">
                            {assignedVehicle ? <Link2 className="w-3.5 h-3.5 text-[hsl(var(--primary))]" /> : <Link2Off className="w-3.5 h-3.5 text-[hsl(var(--text-muted))]" />}
                            <span className={assignedVehicle ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--text-muted))]"}>
                              {assignedVehicle ? "Đổi xe" : "Gán xe"}
                            </span>
                            <ChevronDown className="w-3 h-3 text-[hsl(var(--text-muted))]" />
                          </button>
                          {assignDropdown === d.id && (
                            <div className="absolute top-full left-0 mt-1 z-50 bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)] shadow-xl py-1 min-w-[180px] fade-up">
                              {availableVehicles.length === 0 && !assignedVehicle && (
                                <div className="px-3 py-2 text-xs text-[hsl(var(--text-muted))]">Không có xe trống</div>
                              )}
                              {availableVehicles.map(v => (
                                <button key={v.id} onClick={() => handleAssignVehicle(d.id, v.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[hsl(var(--bg-hover))] transition-colors text-left">
                                  <Truck className="w-3 h-3 text-[hsl(var(--text-muted))]" />
                                  <div>
                                    <div className="font-medium text-[hsl(var(--text))]">{v.plate}</div>
                                    <div className="text-[10px] text-[hsl(var(--text-muted))]">{v.name} · {v.capacityKg} kg</div>
                                  </div>
                                </button>
                              ))}
                              {assignedVehicle && (
                                <>
                                  <div className="border-t border-[hsl(var(--border-sub))] my-1" />
                                  <button onClick={() => handleAssignVehicle(d.id, null)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[hsl(var(--bg-hover))] transition-colors text-left text-[hsl(var(--red))]">
                                    <Link2Off className="w-3 h-3" />
                                    Bỏ gán xe
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <button onClick={() => handleDeleteDriver(d)}
                          className="p-1 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--red))] rounded transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Modal: Thêm xe ─────────────────────────────────────────────────── */}
      {showAddVehicle && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 fade-in"
          onClick={e => { if (e.target === e.currentTarget) setShowAddVehicle(false); }}>
          <div className={`${C.card} p-6 w-full max-w-sm shadow-2xl fade-up space-y-3`}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-[hsl(var(--text))]">Thêm xe mới</h2>
              <button onClick={() => setShowAddVehicle(false)} className="w-6 h-6 flex items-center justify-center rounded text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))] hover:bg-[hsl(var(--bg-hover))]">✕</button>
            </div>
            {[
              { label: "Biển số *",      field: "plate",         type: "text"   },
              { label: "Tên xe",          field: "name",          type: "text"   },
              { label: "Tải trọng (kg)", field: "capacityKg",    type: "number" },
              { label: "Chi phí/km ($)", field: "costPerKm",     type: "number" },
              { label: "CO₂ (kg/km)",    field: "emissionPerKm", type: "number" },
            ].map(f => (
              <div key={f.field}>
                <label className="block text-xs text-[hsl(var(--text-muted))] mb-1.5">{f.label}</label>
                <input type={f.type}
                  value={(vehicleForm as Record<string, unknown>)[f.field] as string}
                  onChange={e => setVehicleForm(p => ({ ...p, [f.field]: f.type === "number" ? +e.target.value : e.target.value }))}
                  className="input" />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowAddVehicle(false)} className="btn-secondary flex-1 justify-center">Hủy</button>
              <button onClick={handleAddVehicle} className="btn-primary flex-1 justify-center">Thêm xe</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Thêm tài xế ─────────────────────────────────────────────── */}
      {showAddDriver && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 fade-in"
          onClick={e => { if (e.target === e.currentTarget) setShowAddDriver(false); }}>
          <div className={`${C.card} p-6 w-full max-w-sm shadow-2xl fade-up space-y-3`}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-[hsl(var(--text))]">Thêm tài xế mới</h2>
              <button onClick={() => setShowAddDriver(false)} className="w-6 h-6 flex items-center justify-center rounded text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))] hover:bg-[hsl(var(--bg-hover))]">✕</button>
            </div>
            {[
              { label: "Họ tên *",          field: "name",      type: "text", placeholder: "Nguyễn Văn A" },
              { label: "Số điện thoại *",   field: "phone",     type: "tel",  placeholder: "0901234567" },
              { label: "Số bằng lái xe",    field: "licenseNo", type: "text", placeholder: "B2 - 123456789" },
            ].map(f => (
              <div key={f.field}>
                <label className="block text-xs text-[hsl(var(--text-muted))] mb-1.5">{f.label}</label>
                <input type={f.type}
                  value={(driverForm as Record<string, string>)[f.field]}
                  onChange={e => setDriverForm(p => ({ ...p, [f.field]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="input" />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowAddDriver(false)} className="btn-secondary flex-1 justify-center">Hủy</button>
              <button onClick={handleAddDriver} className="btn-primary flex-1 justify-center">
                <UserCheck className="w-3.5 h-3.5" />Thêm tài xế
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
