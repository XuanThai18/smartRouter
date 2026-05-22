import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[hsl(var(--bg))] flex flex-col items-center justify-center gap-6">
      <div className="text-center">
        <div className="text-8xl font-black text-[hsl(var(--border))] leading-none mb-4">404</div>
        <h1 className="text-xl font-semibold text-[hsl(var(--text))] mb-2">Trang không tồn tại</h1>
        <p className="text-sm text-[hsl(var(--text-muted))] max-w-xs">
          Trang bạn đang tìm không tồn tại hoặc đã bị xóa.
        </p>
      </div>
      <Link href="/dashboard"
        className="px-5 py-2.5 bg-[hsl(var(--primary))] text-white rounded-[var(--radius)] text-sm font-semibold hover:opacity-90 transition-opacity">
        ← Về Dashboard
      </Link>
    </div>
  );
}
