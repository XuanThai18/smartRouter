"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
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
    <html lang="vi">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-[#fafafa] p-4 text-center font-sans">
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 bg-[#ef4444]/10 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-[#ef4444]" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Lỗi Hệ Thống Nghiêm Trọng</h2>
            <p className="text-[#a1a1aa] mb-8 text-sm leading-relaxed">
              Không thể tải ứng dụng do một sự cố ở cấp độ toàn cục.
            </p>
            
            <button
              onClick={() => reset()}
              className="flex items-center justify-center gap-2 h-10 w-full bg-[#10b981] text-black font-medium rounded-lg hover:brightness-110 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Tải lại trang
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
