/**
 * SmartRoute — Worker Entry Point
 *
 * Khởi động BullMQ Worker để xử lý các job tối ưu hóa NSGA-II trong background.
 *
 * Chạy:
 *   npm run worker
 *   hoặc: npx tsx src/scripts/startWorker.ts
 */

// Load biến môi trường từ .env
import { config } from "dotenv";
config({ path: ".env" });

import { createOptimizeWorker } from "@/lib/worker";

console.log("🚀 SmartRoute Worker đang khởi động...");
console.log(`📡 Kết nối Redis: ${process.env.REDIS_URL ?? "redis://localhost:6379"}`);

const worker = createOptimizeWorker();

console.log('✅ Worker đang lắng nghe queue "optimize-queue"...');
console.log("   Nhấn Ctrl+C để dừng.\n");

// Graceful shutdown
async function shutdown() {
  console.log("\n⏳ Đang tắt Worker...");
  await worker.close();
  console.log("✅ Worker đã tắt an toàn.");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
