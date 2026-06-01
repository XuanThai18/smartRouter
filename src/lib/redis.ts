import Redis from "ioredis";

// Singleton Redis client — tái sử dụng trong toàn bộ app (tránh connection leak)
const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null, // Required by BullMQ
    lazyConnect: false,
    enableReadyCheck: false,
    reconnectOnError: (err) => {
      // Tự reconnect khi gặp lỗi READONLY (Redis failover)
      return err.message.includes("READONLY");
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export default redis;
