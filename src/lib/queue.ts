/**
 * SmartRoute — BullMQ Queue Layer
 *
 * Quản lý hàng đợi tác vụ tối ưu hóa NSGA-II.
 * - `addOptimizeJob()`: Đưa bài toán vào Queue, trả về jobId ngay lập tức.
 * - `getJobStatus()`: Lấy trạng thái và tiến độ của job theo ID.
 */
import { Queue, Job } from "bullmq";
import Redis from "ioredis";
import type { OptimizeRequest, OptimizeResponse } from "@/lib/types";

// BullMQ cần connection riêng (không dùng chung singleton để tránh xung đột)
function createRedisConnection() {
  return new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  });
}

// ── Queue Singleton ────────────────────────────────────────────────────────────

const QUEUE_NAME = "optimize-queue";

const globalForQueue = globalThis as unknown as {
  optimizeQueue?: Queue<OptimizeRequest, OptimizeResponse>;
};

export const optimizeQueue: Queue<OptimizeRequest, OptimizeResponse> =
  globalForQueue.optimizeQueue ??
  new Queue(QUEUE_NAME, {
    connection: createRedisConnection() as any,
    defaultJobOptions: {
      attempts: 1,         // Không retry nếu fail (thuật toán = deterministic effort)
      removeOnComplete: {  // Giữ 50 jobs hoàn thành gần nhất
        count: 50,
      },
      removeOnFail: {      // Giữ 20 jobs lỗi để debug
        count: 20,
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForQueue.optimizeQueue = optimizeQueue;
}

// ── Job Status ─────────────────────────────────────────────────────────────────

export type JobState = "waiting" | "active" | "completed" | "failed" | "unknown";

export interface JobStatus {
  jobId: string;
  state: JobState;
  progress: number;          // 0–100
  progressMessage: string;   // VD: "Đang tính toán thế hệ 150/500..."
  result?: OptimizeResponse;
  error?: string;
  createdAt?: number;
  finishedAt?: number;
}

export async function addOptimizeJob(payload: OptimizeRequest): Promise<string> {
  const job = await optimizeQueue.add("optimize", payload, {
    jobId: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  });
  return job.id!;
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const job = await Job.fromId<OptimizeRequest, OptimizeResponse>(optimizeQueue, jobId);

  if (!job) {
    return { jobId, state: "unknown", progress: 0, progressMessage: "Job không tồn tại" };
  }

  const state = (await job.getState()) as JobState;
  const rawProgress = job.progress as number | { pct: number; message: string } | undefined;

  let progress = 0;
  let progressMessage = "";

  if (typeof rawProgress === "number") {
    progress = rawProgress;
  } else if (typeof rawProgress === "object" && rawProgress !== null) {
    progress = rawProgress.pct;
    progressMessage = rawProgress.message;
  }

  return {
    jobId,
    state,
    progress,
    progressMessage,
    result: state === "completed" ? (job.returnvalue ?? undefined) : undefined,
    error: state === "failed" ? (job.failedReason ?? "Lỗi không xác định") : undefined,
    createdAt: job.timestamp,
    finishedAt: job.finishedOn ?? undefined,
  };
}
