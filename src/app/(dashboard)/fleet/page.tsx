"use client";
import { useState, useEffect } from "react";
import { Plus, Truck, Trash2, ChevronDown } from "lucide-react";
import { useToast } from "@/components/Toast";
import { fetchApi, postApi, putApi, deleteApi } from "@/lib/fetchApi";

interface Vehicle {
  id:string; plate:string; name:string; capacityKg:number;
  costPerKm:number; emissionPerKm:number; status:string;
  driver?:{name:string;phone:string};
}

const STATUS_CYCLE: Record<string,string> = {
  AVAILABLE: "MAINTENANCE", MAINTENANCE: "AVAILABLE", ON_ROUTE: "ON_ROUTE",
};
const STATUS_MAP: Record<string,{label:string;dot:string;cls:string}> = {
  AVAILABLE:   {label:"Sẵn sàng",  dot:"bg-[hsl(var(--green))]",   cls:"text-[hsl(var(--green))]"},
  ON_ROUTE:    {label:"Đang chạy", dot:"bg-[hsl(var(--primary))]", cls:"text-[hsl(var(--primary))]"},
  MAINTENANCE: {label:"Bảo dưỡng", dot:"bg-[hsl(var(--orange))]",  cls:"text-[hsl(var(--orange))]"},
};

const C = { card: "bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)]" };

export default function FleetPage() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [statusDropdown, setStatusDropdown] = useState<string|null>(null);
  const [form, setForm] = useState({
    plate:"", name:"", capacityKg:500, costPerKm:2.0, emissionPerKm:0.21,
  });

  const load = async () => {
    setLoading(true);
    const data = await fetchApi<Vehicle[]>("/api/vehicles");
    setVehicles(data); setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const handleAdd = async () => {
    if (!form.plate) { toast("warning","Thiếu thông tin","Vui lòng nhập biển số xe"); return; }
    try {
      await postApi("/api/vehicles", form);
      toast("success","Đã thêm xe",form.plate);
      setShowAdd(false);
      setForm({plate:"",name:"",capacityKg:500,costPerKm:2.0,emissionPerKm:0.21});
      load();
    } catch (err) { toast("error","Lỗi", err instanceof Error ? err.message : "Không thể thêm xe"); }
  };

  const handleStatusChange = async (v:Vehicle, next:string) => {
    await putApi(`/api/vehicles/${v.id}`, {status:next});
    setStatusDropdown(null);
    toast("success","Cập nhật trạng thái",`${v.plate} → ${STATUS_MAP[next]?.label}`);
    load();
  };

  const handleDelete = async (v:Vehicle) => {
    if (!confirm(`Xóa xe ${v.plate}?`)) return;
    try {
      await deleteApi(`/api/vehicles/${v.id}`);
      toast("success","Đã xóa xe",v.plate);
      load();
    } catch { toast("error","Lỗi","Không thể xóa xe đang được sử dụng"); }
  };

  const stats = {
    total:     vehicles.length,
    available: vehicles.filter(v=>v.status==="AVAILABLE").length,
    onRoute:   vehicles.filter(v=>v.status==="ON_ROUTE").length,
    maint:     vehicles.filter(v=>v.status==="MAINTENANCE").length,
  };

  return (
    <div className="p-6 space-y-4 w-full">

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {[
            {label:`${stats.total} xe`,         dot:""},
            {label:`${stats.available} sẵn sàng`,dot:"bg-[hsl(var(--green))]"},
            {label:`${stats.onRoute} đang chạy`, dot:"bg-[hsl(var(--primary))]"},
            {label:`${stats.maint} bảo dưỡng`,  dot:"bg-[hsl(var(--orange))]"},
          ].map((s,i)=>(
            <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[hsl(var(--text-sub))] bg-[hsl(var(--bg-hover))] border border-[hsl(var(--border))] rounded-full">
              {s.dot && <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/>}
              {s.label}
            </div>
          ))}
        </div>
        <button onClick={()=>setShowAdd(true)} className="btn-primary text-xs">
          <Plus className="w-3.5 h-3.5"/>Thêm xe
        </button>
      </div>

      {/* Table */}
      <div className={C.card}>
        <table className="data-table">
          <thead>
            <tr>{["Biển số","Tên xe","Tải trọng","Chi phí/km","CO₂/km","Tài xế","Trạng thái",""].map(h=><th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? Array.from({length:4}).map((_,i)=>(
              <tr key={i}>{Array.from({length:8}).map((_,j)=>(<td key={j}><div className="h-3.5 bg-[hsl(var(--bg-hover))] rounded animate-pulse w-3/4"/></td>))}</tr>
            )) : vehicles.length===0 ? (
              <tr><td colSpan={8} className="py-16 text-center">
                <Truck className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--text-muted))]"/>
                <p className="text-sm text-[hsl(var(--text-muted))]">Chưa có xe nào. Thêm xe đầu tiên!</p>
              </td></tr>
            ) : vehicles.map(v=>{
              const s = STATUS_MAP[v.status]??{label:v.status,dot:"bg-gray-400",cls:""};
              return (
                <tr key={v.id}>
                  <td className="font-semibold text-[hsl(var(--text))]">{v.plate}</td>
                  <td className="text-[hsl(var(--text-sub))]">{v.name}</td>
                  <td className="text-[hsl(var(--text-sub))]">{v.capacityKg} kg</td>
                  <td className="text-[hsl(var(--text-sub))]">${v.costPerKm}/km</td>
                  <td className="text-[hsl(var(--text-sub))]">{v.emissionPerKm} kg/km</td>
                  <td className="text-[hsl(var(--text-sub))]">{v.driver?.name ?? <span className="text-[hsl(var(--text-muted))]">—</span>}</td>
                  <td>
                    {/* Inline status dropdown */}
                    <div className="relative">
                      <button onClick={()=>setStatusDropdown(statusDropdown===v.id?null:v.id)}
                        className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-[var(--radius)] transition-colors hover:bg-[hsl(var(--bg-hover))] cursor-pointer`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/>
                        <span className={s.cls}>{s.label}</span>
                        <ChevronDown className="w-3 h-3 text-[hsl(var(--text-muted))]"/>
                      </button>
                      {statusDropdown===v.id && (
                        <div className="absolute top-full left-0 mt-1 z-50 bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[var(--radius)] shadow-xl py-1 min-w-[140px] fade-up">
                          {["AVAILABLE","MAINTENANCE","ON_ROUTE"].map(st=>{
                            const ms = STATUS_MAP[st];
                            return (
                              <button key={st} onClick={()=>handleStatusChange(v,st)}
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
                    <button onClick={()=>handleDelete(v)}
                      className="p-1 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--red))] rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 fade-in"
          onClick={e=>{if(e.target===e.currentTarget)setShowAdd(false)}}>
          <div className={`${C.card} p-6 w-full max-w-sm shadow-2xl fade-up space-y-3`}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-[hsl(var(--text))]">Thêm xe mới</h2>
              <button onClick={()=>setShowAdd(false)} className="w-6 h-6 flex items-center justify-center rounded text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))] hover:bg-[hsl(var(--bg-hover))]">✕</button>
            </div>
            {[
              {label:"Biển số *",        field:"plate",         type:"text"},
              {label:"Tên xe",           field:"name",          type:"text"},
              {label:"Tải trọng (kg)",   field:"capacityKg",    type:"number"},
              {label:"Chi phí/km ($)",   field:"costPerKm",     type:"number"},
              {label:"CO₂ (kg/km)",      field:"emissionPerKm", type:"number"},
            ].map(f=>(
              <div key={f.field}>
                <label className="block text-xs text-[hsl(var(--text-muted))] mb-1.5">{f.label}</label>
                <input type={f.type}
                  value={(form as Record<string,unknown>)[f.field] as string}
                  onChange={e=>setForm(p=>({...p,[f.field]:f.type==="number"?+e.target.value:e.target.value}))}
                  className="input"/>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button onClick={()=>setShowAdd(false)} className="btn-secondary flex-1 justify-center">Hủy</button>
              <button onClick={handleAdd} className="btn-primary flex-1 justify-center">Thêm xe</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
