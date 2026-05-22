import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { NSGAEngine, CustomerNode, VehicleConfig } from "@/lib/nsga2/engine";

// POST /api/optimize — chạy NSGA-II và lưu kết quả
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    date, depotLat = 10.7769, depotLng = 106.7009,
    populationSize = 80, generations = 150,
    mode = "nsga2",
    w_dist = 0.4, w_co2 = 0.3, w_cost = 0.3,
  } = body;

  // 1. Lấy đơn hàng PENDING trong ngày
  const d = new Date(date);
  const orders = await prisma.order.findMany({
    where: {
      status: "PENDING",
      date: { gte: d, lt: new Date(d.getTime() + 86_400_000) },
    },
  });
  if (orders.length === 0)
    return NextResponse.json({ error: "Không có đơn hàng PENDING cho ngày này" }, { status: 400 });

  const vehicles = await prisma.vehicle.findMany({ where: { status: "AVAILABLE" } });
  if (vehicles.length === 0)
    return NextResponse.json({ error: "Không có xe nào khả dụng" }, { status: 400 });

  // 2. Cấu hình engine
  const customers: CustomerNode[] = orders.map(o => ({
    id: o.id, lat: o.lat, lng: o.lng,
    demandKg: o.demandKg, twStart: o.twStart, twEnd: o.twEnd, serviceMin: o.serviceMin,
  }));
  const vehicleConfigs: VehicleConfig[] = vehicles.map(v => ({
    id: v.id, capacityKg: v.capacityKg,
    costPerKm: v.costPerKm, emissionPerKm: v.emissionPerKm, maxWorkMin: 1440,
  }));

  const engine = new NSGAEngine(customers, vehicleConfigs, {
    populationSize, generations, mode, w_dist, w_co2, w_cost,
  });
  engine.setDepot(depotLat, depotLng);

  // 3. Chạy thuật toán
  const pareto = await engine.run();

  // 4. Lưu RoutePlan + (nếu có nghiệm khả thi → lưu Routes + RouteStops luôn)
  const feasiblePareto = pareto.filter(p => p.feasible);
  const bestSolution   = feasiblePareto.length > 0 ? feasiblePareto[0] : pareto[0];

  const plan = await prisma.routePlan.create({
    data: {
      date: d,
      status: "READY",
      algoConfig: { mode, populationSize, generations, w_dist, w_co2, w_cost, depotLat, depotLng },
      paretoFront: JSON.parse(JSON.stringify(pareto.slice(0, 30))),
      selectedIdx: 0,
    },
  });

  // Clear any existing RouteStops for these orders to prevent unique constraint errors (P2002)
  // This happens if a user sets an order back to PENDING and re-runs optimization.
  await prisma.routeStop.deleteMany({
    where: { orderId: { in: orders.map(o => o.id) } }
  });

  // Lưu Routes + RouteStops từ bestSolution
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

    // RouteStops với ETA ước tính
    let currentTime = 360; // 6:00 sáng
    const SPEED_KMH = 40;
    let prevLat = depotLat, prevLng = depotLng;

    for (let pos = 0; pos < routeResult.customerSequence.length; pos++) {
      const orderId = routeResult.customerSequence[pos];
      const order   = orders.find(o => o.id === orderId);
      if (!order) continue;

      const dist = Math.sqrt((order.lat - prevLat) ** 2 + (order.lng - prevLng) ** 2) * 111;
      const travelMin = (dist / SPEED_KMH) * 60;
      currentTime += travelMin;
      const arrival = Math.max(currentTime, order.twStart);
      const departure = arrival + order.serviceMin;
      currentTime = departure;
      prevLat = order.lat; prevLng = order.lng;

      await prisma.routeStop.create({
        data: {
          routeId:      route.id,
          orderId:      orderId,
          position:     pos,
          arrivalEst:   Math.round(arrival),
          departureEst: Math.round(departure),
          status:       "PENDING",
        },
      });

      // Update order status
      await prisma.order.update({
        where: { id: orderId },
        data:  { status: "ASSIGNED" },
      });
    }
  }

  return NextResponse.json({
    planId:     plan.id,
    paretoSize: pareto.length,
    feasible:   feasiblePareto.length,
    pareto:     pareto.slice(0, 30),
    history:    engine.history,
  });
}

// GET /api/optimize — danh sách RoutePlans có đầy đủ stops
export async function GET() {
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
  return NextResponse.json(plans);
}
