/**
 * SmartRoute — BullMQ Optimize Worker
 *
 * Worker chạy độc lập, lắng nghe queue "optimize-queue".
 * Khi có job mới → chạy NSGA-II/Weighted → lưu DB → trả kết quả vào job.returnvalue.
 *
 * Chạy: npx tsx src/scripts/startWorker.ts
 */
import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
import {
  createEngine,
  isNSGAEngine,
  type CustomerNode,
  type VehicleConfig,
  type ParetoPoint,
  type SolutionResult,
} from "@/lib/nsga2";
import {
  DEFAULT_START_TIME_MIN,
  VEHICLE_SPEED_KMH,
  MAX_PARETO_STORED,
} from "@/lib/constants";
import { haversine } from "@/lib/haversine";
import type { OptimizeRequest, OptimizeResponse } from "@/lib/types";

// ── Khởi tạo Prisma & Redis connection riêng cho Worker ───────────────────────

const prisma = new PrismaClient();

function createWorkerRedis() {
  return new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

// ── Helper: đặt progress với message ─────────────────────────────────────────

async function setProgress(
  job: Job,
  pct: number,
  message: string,
): Promise<void> {
  await job.updateProgress({ pct, message });
}

// ── Core optimization logic (di chuyển từ /api/optimize/route.ts) ─────────────

async function runOptimization(
  job: Job<OptimizeRequest, OptimizeResponse>,
): Promise<OptimizeResponse> {
  const config = job.data;
  const {
    date,
    depotLat = 10.7769,
    depotLng = 106.7009,
    mode = "nsga2",
    populationSize,
    generations,
    w_dist,
    w_co2,
    w_cost,
  } = config as OptimizeRequest & { _planId?: string };
  const existingPlanId = (config as any)._planId as string | undefined;


  await setProgress(job, 2, "Đang tải dữ liệu đơn hàng...");

  // 1. Lấy đơn hàng PENDING trong ngày
  const d = new Date(date);
  const orders = await prisma.order.findMany({
    where: {
      status: "PENDING",
      date: { gte: d, lt: new Date(d.getTime() + 86_400_000) },
    },
  });

  if (orders.length === 0) {
    throw new Error("Không có đơn hàng PENDING cho ngày này");
  }

  await setProgress(job, 5, `Đã tải ${orders.length} đơn hàng. Đang tải đội xe...`);

  // 2. Lấy xe khả dụng
  const vehicles = await prisma.vehicle.findMany({
    where: { status: "AVAILABLE" },
  });

  if (vehicles.length === 0) {
    throw new Error("Không có xe nào khả dụng");
  }

  await setProgress(job, 8, `Đội xe: ${vehicles.length} xe. Đang khởi tạo thuật toán...`);

  // 3. Build engine input
  const customers: CustomerNode[] = orders.map((o) => ({
    id: o.id,
    lat: o.lat,
    lng: o.lng,
    demandKg: o.demandKg,
    twStart: o.twStart,
    twEnd: o.twEnd,
    serviceMin: o.serviceMin,
  }));

  const vehicleConfigs: VehicleConfig[] = vehicles.map((v) => ({
    id: v.id,
    capacityKg: v.capacityKg,
    costPerKm: v.costPerKm,
    emissionPerKm: v.emissionPerKm,
    maxWorkMin: 1_440,
  }));

  const depot = { lat: depotLat, lng: depotLng };

  // 4. Tạo engine
  const totalGenerations = generations ?? 200;
  const engine = createEngine(mode, customers, vehicleConfigs, depot, {
    populationSize,
    generations: totalGenerations,
    w_dist,
    w_co2,
    w_cost,
  });

  let pareto: ParetoPoint[];
  let bestSolution: SolutionResult;

  // Progress callback — gọi mỗi 10 thế hệ
  const onProgress = async (gen: number, _total: number) => {
    if (gen % 10 === 0 || gen === totalGenerations - 1) {
      const enginePct = Math.round((gen / totalGenerations) * 80); // 8% → 88%
      await setProgress(
        job,
        8 + enginePct,
        `${mode === "nsga2" ? "NSGA-II" : "Weighted GA"} — Thế hệ ${gen + 1}/${totalGenerations}`,
      );
    }
  };

  if (isNSGAEngine(engine)) {
    pareto = await engine.run(onProgress);
    const feasible = pareto.filter((p) => p.feasible);
    bestSolution = feasible.length > 0 ? feasible[0] : pareto[0];
  } else {
    const result = await engine.run();
    bestSolution = result.solution;
    pareto = [{ ...result.solution, generation: result.generation, chromosome: [] }];
  }


  await setProgress(job, 90, "Thuật toán hoàn thành. Đang lưu kết quả vào cơ sở dữ liệu...");

  // 5. Update RoutePlan đã tạo (status OPTIMIZING → READY) + lưu kết quả Pareto
  const paretoJson = JSON.parse(JSON.stringify(pareto.slice(0, MAX_PARETO_STORED)));
  const plan = existingPlanId
    ? await prisma.routePlan.update({
        where: { id: existingPlanId },
        data: {
          status: "READY",
          paretoFront: paretoJson,
        },
      })
    : await prisma.routePlan.create({
        data: {
          date: d,
          status: "READY",
          algoConfig: { mode, populationSize, generations: totalGenerations, w_dist, w_co2, w_cost, depotLat, depotLng },
          paretoFront: paretoJson,
          selectedIdx: 0,
        },
      });

  // 6. Xóa RouteStops cũ (tránh P2002 khi re-optimize)
  await prisma.routeStop.deleteMany({
    where: { orderId: { in: orders.map((o) => o.id) } },
  });

  // 7. Lưu Routes + RouteStops
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  for (const routeResult of bestSolution.routes) {
    if (routeResult.customerSequence.length === 0) continue;

    const route = await prisma.route.create({
      data: {
        planId: plan.id,
        vehicleId: routeResult.vehicleId,
        sequence: routeResult.customerSequence,
        distance: routeResult.distance,
        co2: routeResult.co2,
        cost: routeResult.cost,
        loadUsed: routeResult.loadUsed,
        feasible: routeResult.feasible,
      },
    });

    let currentTime = DEFAULT_START_TIME_MIN;
    let prevLat = depotLat;
    let prevLng = depotLng;

    for (let pos = 0; pos < routeResult.customerSequence.length; pos++) {
      const orderId = routeResult.customerSequence[pos];
      const order = orderMap.get(orderId);
      if (!order) continue;

      const distKm = haversine(prevLat, prevLng, order.lat, order.lng);
      const travelMin = (distKm / VEHICLE_SPEED_KMH) * 60;
      currentTime += travelMin;

      const arrival = Math.max(currentTime, order.twStart);
      const departure = arrival + order.serviceMin;
      currentTime = departure;
      prevLat = order.lat;
      prevLng = order.lng;

      await prisma.routeStop.create({
        data: {
          routeId: route.id,
          orderId,
          position: pos,
          arrivalEst: Math.round(arrival),
          departureEst: Math.round(departure),
          status: "PENDING",
        },
      });

      await prisma.order.update({
        where: { id: orderId },
        data: { status: "ASSIGNED" },
      });
    }
  }

  await setProgress(job, 98, "Hoàn tất. Đang chuẩn bị kết quả...");

  const history = engine.history;
  const feasibleCount = isNSGAEngine(engine)
    ? pareto.filter((p) => p.feasible).length
    : bestSolution.feasible ? 1 : 0;

  return {
    planId: plan.id,
    paretoSize: pareto.length,
    feasible: feasibleCount,
    pareto: pareto.slice(0, MAX_PARETO_STORED) as OptimizeResponse["pareto"],
    history: [...history],
  };
}

// ── Khởi tạo Worker ────────────────────────────────────────────────────────────

const QUEUE_NAME = "optimize-queue";

export function createOptimizeWorker() {
  const worker = new Worker<OptimizeRequest, OptimizeResponse>(
    QUEUE_NAME,
    async (job) => {
      console.log(`[Worker] Bắt đầu job ${job.id} — mode: ${job.data.mode}`);
      const result = await runOptimization(job);
      console.log(`[Worker] Hoàn thành job ${job.id} — planId: ${result.planId}`);
      return result;
    },
    {
      connection: createWorkerRedis() as any,
      concurrency: 1, // Chỉ chạy 1 job tại một thời điểm (NSGA-II tốn CPU)
    },
  );

  worker.on("completed", (job) => {
    console.log(`✅ [Worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ [Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error(`[Worker] Error:`, err);
  });

  return worker;
}
