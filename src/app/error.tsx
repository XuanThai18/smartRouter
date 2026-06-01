"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
      <div className="bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-2xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center">
        <div className="w-16 h-16 bg-[hsl(var(--red-dim))] rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-[hsl(var(--red))]" />
        </div>
        <h2 className="text-2xl font-bold text-[hsl(var(--text))] mb-2">Đã có lỗi xảy ra</h2>
        <p className="text-[hsl(var(--text-muted))] mb-8 text-sm leading-relaxed">
          Chúng tôi rất tiếc, đã có một sự cố xảy ra khi xử lý yêu cầu của bạn.
          <br />
          <span className="font-mono text-[10px] mt-2 block opacity-50 bg-[hsl(var(--bg))] p-2 rounded truncate max-w-full">
            {error.message || "Unknown error"}
          </span>
        </p>
        
        <div className="flex w-full gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 flex items-center justify-center gap-2 h-10 bg-[hsl(var(--primary))] text-[hsl(var(--bg))] font-medium rounded-lg hover:brightness-110 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Thử lại
          </button>
          
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 h-10 border border-[hsl(var(--border))] text-[hsl(var(--text))] font-medium rounded-lg hover:bg-[hsl(var(--bg-hover))] transition-all"
          >
            <Home className="w-4 h-4" />
            Trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
