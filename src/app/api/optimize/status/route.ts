import { NextRequest } from "next/server";
import { getJobStatus } from "@/lib/queue";
import { ok, badRequest, serverError } from "@/lib/api";

/**
 * GET /api/optimize/status?jobId=xxx
 *
 * Poll trạng thái của một optimization job:
 * - state: "waiting" | "active" | "completed" | "failed" | "unknown"
 * - progress: 0–100
 * - progressMessage: mô tả tiến độ
 * - result: OptimizeResponse (chỉ có khi state = "completed")
 * - error: string (chỉ có khi state = "failed")
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return badRequest("Thiếu tham số jobId");
    }

    const status = await getJobStatus(jobId);
    return ok(status);
  } catch (err) {
    return serverError("Lỗi khi lấy trạng thái job", err);
  }
}
