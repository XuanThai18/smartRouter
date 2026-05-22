"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Search, Upload, Trash2, Package, Clock, Weight, ChevronDown, Filter } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/components/Toast";

interface Order {
  id: string; code: string; customerName: string; phone?: string;
  address: string; lat: number; lng: number; demandKg: number;
  twStart: number; twEnd: number; serviceMin: number; status: string; createdAt: string;
}

const STATUS_TABS = [
  {key:"",          label:"Tất cả"},
  {key:"PENDING",   label:"Chờ phân công"},
  {key:"ASSIGNED",  label:"Đã phân công"},
  {key:"IN_TRANSIT",label:"Đang giao"},
  {key:"DELIVERED", label:"Hoàn thành"},
  {key:"FAILED",    label:"Thất bại"},
];
const STATUS_MAP: Record<string,{dot:string;label:string;cls:string}> = {
  PENDING:    {dot:"bg-[hsl(var(--orange))]", label:"Chờ phân công",  cls:"text-[hsl(var(--orange))]"},
  ASSIGNED:   {dot:"bg-[hsl(var(--primary))]",label:"Đã phân công",   cls:"text-[hsl(var(--primary))]"},
  IN_TRANSIT: {dot:"bg-[hsl(var(--primary))]",label:"Đang giao",      cls:"text-[hsl(var(--primary))]"},
  DELIVERED:  {dot:"bg-[hsl(var(--green))]",  label:"Hoàn thành",     cls:"text-[hsl(var(--green))]"},
  FAILED:     {dot:"bg-[hsl(var(--red))]",    label:"Thất bại",       cls:"text-[hsl(var(--red))]"},
};
const STATUS_OPTIONS = ["PENDING","ASSIGNED","IN_TRANSIT","DELIVERED","FAILED"];

function minToTime(m:number){ return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`; }

const C = {
  card: "bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)]",
};

export default function OrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders]     = useState<Order[]>([]);
  const [search, setSearch]     = useState("");
  const [statusTab, setStatusTab] = useState("");
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [statusDropdown, setStatusDropdown] = useState<string|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    customerName:"", phone:"", address:"",
    demandKg:10, twStart:480, twEnd:720, serviceMin:10,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusTab ? `/api/orders?status=${statusTab}` : "/api/orders";
      const data = await fetch(url).then(r=>r.json());
      setOrders(data);
    } finally { setLoading(false); }
  }, [statusTab]);

  useEffect(() => { load(); }, [load]);

  const filtered = orders.filter(o =>
    [o.customerName, o.address, o.code].some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAdd = async () => {
    if (!form.customerName || !form.address) { toast("warning","Thiếu thông tin","Vui lòng nhập tên khách và địa chỉ"); return; }
    try {
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(form.address+", Việt Nam")}&format=json&limit=1`
      ).then(r=>r.json());
      const lat = geo?.[0]?.lat ? +geo[0].lat : 10.7769;
      const lng = geo?.[0]?.lon ? +geo[0].lon : 106.7009;
      if (!geo?.[0]) toast("warning","Geocoding","Không tìm thấy địa chỉ, dùng tọa độ mặc định");

      await fetch("/api/orders",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...form, lat, lng}),
      });
      toast("success","Đã thêm đơn hàng",`${form.customerName} — ${form.address}`);
      setShowAdd(false);
      setForm({customerName:"",phone:"",address:"",demandKg:10,twStart:480,twEnd:720,serviceMin:10});
      load();
    } catch { toast("error","Lỗi","Không thể thêm đơn hàng"); }
  };

  const handleDelete = async (id:string, name:string) => {
    if (!confirm(`Xóa đơn hàng của ${name}?`)) return;
    await fetch(`/api/orders/${id}`,{method:"DELETE"});
    toast("success","Đã xóa",`Đơn hàng của ${name}`);
    load();
  };

  const handleStatusChange = async (id:string, status:string) => {
    await fetch(`/api/orders/${id}`,{
      method:"PUT", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({status}),
    });
    setStatusDropdown(null);
    toast("success","Cập nhật trạng thái",STATUS_MAP[status]?.label ?? status);
    load();
  };

  const handleImport = async (e:React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImporting(true);
    try {
      const wb   = XLSX.read(await file.arrayBuffer());
      const rows = XLSX.utils.sheet_to_json<Record<string,unknown>>(wb.Sheets[wb.SheetNames[0]]);
      const data = rows.map(r=>({
        customerName: String(r["Tên khách"]??r["customerName"]??""),
        phone:        String(r["SĐT"]??""),
        address:      String(r["Địa chỉ"]??r["address"]??""),
        demandKg:     Number(r["Khối lượng (kg)"]??10),
        twStart:      Number(r["Giờ mở (phút)"]??480),
        twEnd:        Number(r["Giờ đóng (phút)"]??720),
        serviceMin:   Number(r["Phục vụ (phút)"]??10),
      }));
      toast("info","Đang nhập...","Geocoding địa chỉ — vui lòng đợi");
      const res    = await fetch("/api/orders/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
      const result = await res.json();
      toast("success","Nhập thành công",`${result.success}/${data.length} đơn · Thất bại: ${result.failed}`);
      load();
    } catch { toast("error","Lỗi","Không đọc được file Excel"); }
    finally { setImporting(false); if(e.target) e.target.value=""; }
  };

  const counts = STATUS_TABS.map(t=>({
    ...t, count: t.key ? orders.filter(o=>o.status===t.key).length : orders.length,
  }));

  return (
    <div className="p-6 space-y-4 w-full">

      {/* Status tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {counts.map(t=>(
          <button key={t.key} onClick={()=>setStatusTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] text-xs font-medium whitespace-nowrap transition-colors
              ${statusTab===t.key
                ? "bg-[hsl(var(--primary-dim))] text-[hsl(var(--primary))]"
                : "text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))] hover:bg-[hsl(var(--bg-hover))]"}`}>
            {t.label}
            <span className="px-1.5 py-0.5 rounded-full bg-[hsl(var(--bg-hover))] text-[10px]">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--text-muted))]"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Tìm theo tên, địa chỉ..."
            className="pl-9 pr-3 py-2 input w-60" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>fileRef.current?.click()}
            className="btn-secondary text-xs">
            <Upload className="w-3.5 h-3.5"/>
            {importing ? "Đang nhập..." : "Import Excel"}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport}/>
          <button onClick={()=>setShowAdd(true)} className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5"/> Thêm đơn
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={C.card}>
        <table className="data-table">
          <thead>
            <tr>
              {["Mã đơn","Khách hàng","Địa chỉ","Khối lượng","Khung giờ","Trạng thái",""].map(h=>(
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({length:6}).map((_,i)=>(
              <tr key={i}>
                {Array.from({length:7}).map((_,j)=>(
                  <td key={j}><div className="h-3.5 bg-[hsl(var(--bg-hover))] rounded animate-pulse w-3/4"/></td>
                ))}
              </tr>
            )) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center">
                <Package className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--text-muted))]"/>
                <p className="text-sm text-[hsl(var(--text-muted))]">Không tìm thấy đơn hàng nào</p>
              </td></tr>
            ) : filtered.map(o=>{
              const s = STATUS_MAP[o.status]??{dot:"bg-gray-400",label:o.status,cls:""};
              return (
                <tr key={o.id}>
                  <td className="font-mono text-[11px] text-[hsl(var(--text-muted))]">#{o.code.slice(-8).toUpperCase()}</td>
                  <td>
                    <div className="font-medium text-[hsl(var(--text))]">{o.customerName}</div>
                    {o.phone && <div className="text-[11px] text-[hsl(var(--text-muted))]">{o.phone}</div>}
                  </td>
                  <td className="max-w-[180px]">
                    <div className="text-xs text-[hsl(var(--text-sub))] truncate">{o.address}</div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1 text-xs text-[hsl(var(--text-sub))]">
                      <Weight className="w-3 h-3"/>{o.demandKg} kg
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1 text-xs text-[hsl(var(--text-muted))]">
                      <Clock className="w-3 h-3"/>{minToTime(o.twStart)}–{minToTime(o.twEnd)}
                    </div>
                  </td>
                  <td>
                    {/* Inline status dropdown */}
                    <div className="relative">
                      <button onClick={()=>setStatusDropdown(statusDropdown===o.id?null:o.id)}
                        className="flex items-center gap-1.5 text-xs hover:bg-[hsl(var(--bg-hover))] px-2 py-1 rounded-[var(--radius)] transition-colors">
                        <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/>
                        <span className={s.cls}>{s.label}</span>
                        <ChevronDown className="w-3 h-3 text-[hsl(var(--text-muted))]"/>
                      </button>
                      {statusDropdown===o.id && (
                        <div className="absolute top-full left-0 mt-1 z-50 bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)] shadow-xl py-1 min-w-[160px] fade-up">
                          {STATUS_OPTIONS.map(st=>{
                            const ms = STATUS_MAP[st];
                            return (
                              <button key={st} onClick={()=>handleStatusChange(o.id,st)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[hsl(var(--bg-hover))] transition-colors text-left">
                                <div className={`w-1.5 h-1.5 rounded-full ${ms?.dot}`}/>
                                <span className={ms?.cls}>{ms?.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <button onClick={()=>handleDelete(o.id,o.customerName)}
                      className="p-1 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--red))] rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-[hsl(var(--border))]">
            <span className="text-[11px] text-[hsl(var(--text-muted))]">Hiển thị {filtered.length} / {orders.length} đơn hàng</span>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 fade-in" onClick={e=>{if(e.target===e.currentTarget)setShowAdd(false)}}>
          <div className={`${C.card} p-6 w-full max-w-md shadow-2xl fade-up`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[hsl(var(--text))]">Thêm đơn hàng mới</h2>
              <button onClick={()=>setShowAdd(false)} className="w-6 h-6 flex items-center justify-center rounded-[var(--radius)] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))] hover:bg-[hsl(var(--bg-hover))]">✕</button>
            </div>
            <div className="space-y-3">
              {[
                {label:"Tên khách hàng *", field:"customerName", type:"text"},
                {label:"Số điện thoại",    field:"phone",         type:"text"},
                {label:"Địa chỉ giao *",   field:"address",       type:"text"},
              ].map(f=>(
                <div key={f.field}>
                  <label className="block text-xs text-[hsl(var(--text-muted))] mb-1.5">{f.label}</label>
                  <input type={f.type} value={(form as Record<string,unknown>)[f.field] as string}
                    onChange={e=>setForm(p=>({...p,[f.field]:e.target.value}))} className="input"/>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {label:"Khối lượng (kg)", field:"demandKg",  type:"number"},
                  {label:"Phục vụ (phút)",  field:"serviceMin",type:"number"},
                  {label:"Giờ mở (phút)",   field:"twStart",   type:"number"},
                  {label:"Giờ đóng (phút)", field:"twEnd",     type:"number"},
                ].map(f=>(
                  <div key={f.field}>
                    <label className="block text-xs text-[hsl(var(--text-muted))] mb-1.5">{f.label}</label>
                    <input type="number" value={(form as Record<string,unknown>)[f.field] as number}
                      onChange={e=>setForm(p=>({...p,[f.field]:+e.target.value}))} className="input"/>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[hsl(var(--text-muted))]">💡 Giờ mở/đóng tính bằng phút từ 00:00 (480 = 8:00 sáng)</p>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={()=>setShowAdd(false)} className="btn-secondary flex-1 justify-center">Hủy</button>
              <button onClick={handleAdd} className="btn-primary flex-1 justify-center">Lưu đơn hàng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
