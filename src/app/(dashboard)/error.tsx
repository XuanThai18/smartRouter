"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] h-full w-full p-4 text-center">
      <div className="bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-2xl p-8 max-w-md w-full shadow-lg flex flex-col items-center">
        <div className="w-16 h-16 bg-[hsl(var(--orange-dim))] rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-[hsl(var(--orange))]" />
        </div>
        <h2 className="text-xl font-bold text-[hsl(var(--text))] mb-2">Lỗi tải trang</h2>
        <p className="text-[hsl(var(--text-muted))] mb-8 text-sm leading-relaxed">
          Đã có lỗi xảy ra khi tải nội dung này. Vui lòng thử lại.
        </p>
        
        <button
          onClick={() => reset()}
          className="flex items-center justify-center gap-2 h-10 w-full bg-[hsl(var(--bg-hover))] text-[hsl(var(--text))] font-medium border border-[hsl(var(--border))] rounded-lg hover:bg-[hsl(var(--border))] transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Thử lại
        </button>
      </div>
    </div>
  );
}
