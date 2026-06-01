import { NextRequest } from "next/server";
import { getJobStatus } from "@/lib/queue";

/**
 * GET /api/optimize/stream?jobId=xxx
 *
 * Server-Sent Events (SSE) — stream real-time progress đến Browser.
 * Mỗi 800ms sẽ emit một event với trạng thái hiện tại của job.
 *
 * Events:
 *   - event: "progress" — data: { pct, message }
 *   - event: "done"     — data: OptimizeResponse (job.returnvalue)
 *   - event: "error"    — data: { message }
 *
 * Browser:
 *   const es = new EventSource(`/api/optimize/stream?jobId=${jobId}`);
 *   es.addEventListener("progress", e => console.log(JSON.parse(e.data)));
 *   es.addEventListener("done", e => { const result = JSON.parse(e.data); es.close(); });
 *   es.addEventListener("error", e => { es.close(); });
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return new Response("Thiếu tham số jobId", { status: 400 });
  }

  const encoder = new TextEncoder();

  // SSE Response stream
  const stream = new ReadableStream({
    async start(controller) {
      const POLL_INTERVAL_MS = 800;
      const MAX_DURATION_MS  = 10 * 60 * 1000; // timeout 10 phút
      const startedAt = Date.now();

      const send = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      // Gửi heartbeat ngay để client biết kết nối thành công
      send("ping", { ts: Date.now() });

      const poll = async () => {
        try {
          const status = await getJobStatus(jobId);

          if (status.state === "completed") {
            send("progress", { pct: 100, message: "Hoàn tất!" });
            send("done", status.result);
            controller.close();
            return;
          }

          if (status.state === "failed") {
            send("error", { message: status.error ?? "Lỗi không xác định" });
            controller.close();
            return;
          }

          if (Date.now() - startedAt > MAX_DURATION_MS) {
            send("error", { message: "Quá thời gian chờ tối ưu hóa (10 phút)" });
            controller.close();
            return;
          }

          // Gửi progress hiện tại
          send("progress", {
            pct: status.progress,
            message: status.progressMessage || `Đang xử lý... (${status.state})`,
          });

          // Poll lại sau POLL_INTERVAL_MS
          setTimeout(poll, POLL_INTERVAL_MS);
        } catch (err) {
          send("error", { message: "Lỗi kết nối server" });
          controller.close();
        }
      };

      // Bắt đầu polling sau 200ms (để response headers được gửi trước)
      setTimeout(poll, 200);
    },
    cancel() {
      // Client đóng kết nối (tab đóng, navigate away) — stream tự clean up
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no", // Tắt buffering của nginx/proxy
    },
  });
}
