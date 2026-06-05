"use client";
import { useEffect, useState } from "react";
import {
  UserPlus, Users, Phone, Car, ShieldCheck, ShieldOff,
  Loader2, Search, Mail, Key, CheckCircle2, AlertCircle, X
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface DriverUser { id: string; email: string; createdAt: string }
interface DriverVehicle { id: string; plate: string; name: string; status: string }
interface Driver {
  id:        string;
  name:      string;
  phone:     string;
  licenseNo: string | null;
  status:    string;
  createdAt: string;
  user:      DriverUser | null;
  vehicle:   DriverVehicle[];
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE:   { label: "Đang làm việc", cls: "bg-green-500/20 text-green-400 border border-green-500/30" },
    INACTIVE: { label: "Ngừng hoạt động", cls: "bg-red-500/20   text-red-400   border border-red-500/30"   },
    ON_LEAVE: { label: "Nghỉ phép",     cls: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-500/20 text-gray-400" };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

// ── Create Driver Modal ───────────────────────────────────────────────────────
function CreateDriverModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm]       = useState({ name: "", phone: "", licenseNo: "", email: "", password: "", grantAccount: false });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  function set(k: string, v: string | boolean) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name:      form.name,
        phone:     form.phone,
        licenseNo: form.licenseNo || undefined,
        status:    "ACTIVE",
      };
      if (form.grantAccount && form.email && form.password) {
        body.email    = form.email;
        body.password = form.password;
      }
      const res = await fetch("/api/drivers", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Lỗi không xác định"); return; }
      onCreated();
      onClose();
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[hsl(220_14%_12%)] border border-[hsl(220_14%_22%)] rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[hsl(220_14%_20%)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/20"><UserPlus className="w-4 h-4 text-blue-400" /></div>
            <h2 className="font-semibold text-white">Thêm Tài xế mới</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[hsl(220_14%_20%)] text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Thông tin hồ sơ */}
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">Họ và tên *</label>
            <input
              required value={form.name} onChange={e => set("name", e.target.value)}
              className="w-full bg-[hsl(220_14%_8%)] border border-[hsl(220_14%_22%)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="Nguyễn Văn A"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">Số điện thoại *</label>
            <input
              required value={form.phone} onChange={e => set("phone", e.target.value)}
              className="w-full bg-[hsl(220_14%_8%)] border border-[hsl(220_14%_22%)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="0901234567"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">Số GPLX (tùy chọn)</label>
            <input
              value={form.licenseNo} onChange={e => set("licenseNo", e.target.value)}
              className="w-full bg-[hsl(220_14%_8%)] border border-[hsl(220_14%_22%)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="012345678901"
            />
          </div>

          {/* Toggle cấp tài khoản */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(220_14%_8%)] border border-[hsl(220_14%_22%)] cursor-pointer"
               onClick={() => set("grantAccount", !form.grantAccount)}>
            <div className={`w-9 h-5 rounded-full transition-colors ${form.grantAccount ? "bg-blue-500" : "bg-gray-600"} relative`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.grantAccount ? "left-4" : "left-0.5"}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Cấp tài khoản đăng nhập ngay</p>
              <p className="text-xs text-gray-400">Tạo email và mật khẩu để tài xế đăng nhập hệ thống</p>
            </div>
          </div>

          {/* Tài khoản đăng nhập */}
          {form.grantAccount && (
            <div className="space-y-3 p-3 rounded-xl border border-blue-500/30 bg-blue-500/5">
              <div className="flex items-center gap-1.5 text-xs text-blue-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Thông tin tài khoản tài xế
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Email đăng nhập *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="email" value={form.email} onChange={e => set("email", e.target.value)}
                    className="w-full bg-[hsl(220_14%_8%)] border border-[hsl(220_14%_22%)] rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="driver.nguyenvana@company.vn"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Mật khẩu tạm *</label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="password" value={form.password} onChange={e => set("password", e.target.value)}
                    className="w-full bg-[hsl(220_14%_8%)] border border-[hsl(220_14%_22%)] rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="Tối thiểu 6 ký tự"
                  />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-[hsl(220_14%_24%)] text-sm text-gray-400 hover:bg-[hsl(220_14%_18%)] hover:text-white transition-colors">
              Hủy
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium text-white transition-colors flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {saving ? "Đang tạo..." : "Tạo tài xế"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DriversPage() {
  const [drivers, setDrivers]   = useState<Driver[]>([]);
  const [loading, setLoading]   = useState(true);
  const [q, setQ]               = useState("");
  const [showModal, setModal]   = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/drivers?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(d => setDrivers(d.data ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [q]); // eslint-disable-line

  const total    = drivers.length;
  const active   = drivers.filter(d => d.status === "ACTIVE").length;
  const hasAcct  = drivers.filter(d => d.user).length;

  return (
    <div className="p-6 space-y-6">
      {showModal && <CreateDriverModal onClose={() => setModal(false)} onCreated={load} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Quản lý Tài xế</h1>
          <p className="text-sm text-gray-400 mt-0.5">Danh sách nhân sự lái xe và tài khoản đăng nhập</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
          <UserPlus className="w-4 h-4" /> Thêm tài xế
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Tổng tài xế",        value: total,   color: "text-blue-400",  icon: Users },
          { label: "Đang làm việc",       value: active,  color: "text-green-400", icon: Car   },
          { label: "Đã cấp tài khoản",   value: hasAcct, color: "text-violet-400",icon: ShieldCheck },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-[hsl(220_14%_14%)] border border-[hsl(220_14%_20%)] rounded-xl p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-[hsl(220_14%_20%)]`}><Icon className={`w-5 h-5 ${color}`} /></div>
            <div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
        <input
          value={q} onChange={e => setQ(e.target.value)}
          className="w-full bg-[hsl(220_14%_12%)] border border-[hsl(220_14%_22%)] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-500"
          placeholder="Tìm theo tên hoặc số điện thoại..."
        />
      </div>

      {/* Table */}
      <div className="bg-[hsl(220_14%_12%)] border border-[hsl(220_14%_20%)] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(220_14%_20%)] text-xs text-gray-400 uppercase tracking-wide">
              <th className="text-left px-4 py-3">Tài xế</th>
              <th className="text-left px-4 py-3">Liên hệ</th>
              <th className="text-left px-4 py-3">Xe được gán</th>
              <th className="text-left px-4 py-3">Tài khoản HT</th>
              <th className="text-left px-4 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="text-center py-16 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Đang tải...
              </td></tr>
            )}
            {!loading && drivers.length === 0 && (
              <tr><td colSpan={5} className="text-center py-16 text-gray-500">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Chưa có tài xế nào. Nhấn "+ Thêm tài xế" để bắt đầu.</p>
              </td></tr>
            )}
            {drivers.map(driver => (
              <tr key={driver.id} className="border-b border-[hsl(220_14%_16%)] hover:bg-[hsl(220_14%_15%)] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-semibold text-xs">
                      {driver.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white">{driver.name}</p>
                      {driver.licenseNo && <p className="text-xs text-gray-400">GPLX: {driver.licenseNo}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <Phone className="w-3.5 h-3.5 text-gray-500" /> {driver.phone}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {driver.vehicle.length > 0 ? (
                    <div className="flex items-center gap-1.5 text-gray-300">
                      <Car className="w-3.5 h-3.5 text-gray-500" />
                      {driver.vehicle.map(v => v.plate).join(", ")}
                    </div>
                  ) : (
                    <span className="text-gray-500 text-xs">Chưa gán xe</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {driver.user ? (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-green-400 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đã cấp tài khoản
                      </div>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {driver.user.email}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                      <ShieldOff className="w-3.5 h-3.5" /> Chưa có tài khoản
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={driver.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
