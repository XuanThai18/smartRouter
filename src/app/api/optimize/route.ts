import { NextRequest } from "next/server";
import { ZodError } from "zod";
import prisma from "@/lib/db";
import { ok, badRequest, serverError, validationError } from "@/lib/api";
import { OptimizeSchema } from "@/lib/validators/optimize.schema";
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

// ── POST /api/optimize — chạy thuật toán tối ưu và lưu kết quả ───────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config = OptimizeSchema.parse(body);
    const { date, depotLat, depotLng, mode, populationSize, generations, w_dist, w_co2, w_cost } = config;

    // 1. Lấy đơn hàng PENDING trong ngày
    const d = new Date(date);
    const orders = await prisma.order.findMany({
      where: {
        status: "PENDING",
        date: { gte: d, lt: new Date(d.getTime() + 86_400_000) },
      },
    });

    if (orders.length === 0) {
      return badRequest("Không có đơn hàng PENDING cho ngày này");
    }

    // 2. Lấy xe khả dụng
    const vehicles = await prisma.vehicle.findMany({
      where: { status: "AVAILABLE" },
    });

    if (vehicles.length === 0) {
      return badRequest("Không có xe nào khả dụng");
    }

    // 3. Build engine input
    const customers: CustomerNode[] = orders.map((o) => ({
      id:        o.id,
      lat:       o.lat,
      lng:       o.lng,
      demandKg:  o.demandKg,
      twStart:   o.twStart,
      twEnd:     o.twEnd,
      serviceMin: o.serviceMin,
    }));

    const vehicleConfigs: VehicleConfig[] = vehicles.map((v) => ({
      id:            v.id,
      capacityKg:    v.capacityKg,
      costPerKm:     v.costPerKm,
      emissionPerKm: v.emissionPerKm,
      maxWorkMin:    1_440, // 24h
    }));

    const depot = { lat: depotLat, lng: depotLng };

    // 4. Chạy thuật toán
    const engine = createEngine(mode, customers, vehicleConfigs, depot, {
      populationSize, generations, w_dist, w_co2, w_cost,
    });

    let pareto: ParetoPoint[];
    let bestSolution: SolutionResult;

    if (isNSGAEngine(engine)) {
      // NSGA-II: trả về nhiều nghiệm trên Pareto front
      pareto = await engine.run();
      const feasible = pareto.filter((p) => p.feasible);
      bestSolution = feasible.length > 0 ? feasible[0] : pareto[0];
    } else {
      // Weighted: trả về 1 nghiệm tốt nhất
      const result = await engine.run();
      bestSolution = result.solution;
      // Wrap thành mảng 1 phần tử để API response nhất quán
      pareto = [{ ...result.solution, generation: result.generation, chromosome: [] }];
    }

    // 5. Lưu RoutePlan
    const plan = await prisma.routePlan.create({
      data: {
        date: d,
        status: "READY",
        algoConfig: { mode, populationSize, generations, w_dist, w_co2, w_cost, depotLat, depotLng },
        paretoFront: JSON.parse(JSON.stringify(pareto.slice(0, MAX_PARETO_STORED))),
        selectedIdx: 0,
      },
    });

    // 6. Xóa RouteStops cũ của các đơn hàng này (tránh P2002 khi re-optimize)
    await prisma.routeStop.deleteMany({
      where: { orderId: { in: orders.map((o) => o.id) } },
    });

    // 7. Lưu Routes + RouteStops từ bestSolution
    const orderMap = new Map(orders.map((o) => [o.id, o]));

    for (const routeResult of bestSolution.routes) {
      if (routeResult.customerSequence.length === 0) continue;

      const route = await prisma.route.create({
        data: {
          planId:    plan.id,
          vehicleId: routeResult.vehicleId,
          sequence:  routeResult.customerSequence,
          distance:  routeResult.distance,
          co2:       routeResult.co2,
          cost:      routeResult.cost,
          loadUsed:  routeResult.loadUsed,
          feasible:  routeResult.feasible,
        },
      });

      // Tính ETA bằng Haversine (không dùng Euclidean approximation)
      let currentTime = DEFAULT_START_TIME_MIN; // 06:00
      let prevLat = depotLat;
      let prevLng = depotLng;

      for (let pos = 0; pos < routeResult.customerSequence.length; pos++) {
        const orderId = routeResult.customerSequence[pos];
        const order   = orderMap.get(orderId);
        if (!order) continue;

        const distKm = haversine(prevLat, prevLng, order.lat, order.lng);
        const travelMin = (distKm / VEHICLE_SPEED_KMH) * 60;
        currentTime += travelMin;

        const arrival   = Math.max(currentTime, order.twStart);
        const departure = arrival + order.serviceMin;
        currentTime = departure;
        prevLat = order.lat;
        prevLng = order.lng;

        await prisma.routeStop.create({
          data: {
            routeId:      route.id,
            orderId,
            position:     pos,
            arrivalEst:   Math.round(arrival),
            departureEst: Math.round(departure),
            status:       "PENDING",
          },
        });

        // Chuyển order sang ASSIGNED
        await prisma.order.update({
          where: { id: orderId },
          data:  { status: "ASSIGNED" },
        });
      }
    }

    const history = engine.history;
    const feasibleCount = isNSGAEngine(engine)
      ? pareto.filter((p) => p.feasible).length
      : (bestSolution.feasible ? 1 : 0);

    return ok({
      planId:     plan.id,
      paretoSize: pareto.length,
      feasible:   feasibleCount,
      pareto:     pareto.slice(0, MAX_PARETO_STORED),
      history:    [...history],
      mode,
    });
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    return serverError("Lỗi khi chạy tối ưu hóa", err);
  }
}

// ── GET /api/optimize — danh sách RoutePlans gần nhất ────────────────────────
export async function GET() {
  try {
    const plans = await prisma.routePlan.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        routes: {
          include: {
            vehicle: true,
            stops: {
              include: { order: true },
              orderBy: { position: "asc" },
            },
          },
        },
      },
    });
    return ok(plans);
  } catch (err) {
    return serverError("Lỗi khi lấy danh sách kế hoạch", err);
  }
}
