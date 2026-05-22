import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  const now = new Date();
  const start7 = new Date(now); start7.setDate(now.getDate() - 6); start7.setHours(0,0,0,0);

  const [
    totalOrders, pendingOrders, availableVehicles,
    deliveredOrders, plans, recentRoutes,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.vehicle.count({ where: { status: "AVAILABLE" } }),
    prisma.order.count({ where: { status: "DELIVERED" } }),
    prisma.routePlan.findMany({
      where: { status: { in: ["READY","DISPATCHED","COMPLETED"] } },
      include: { routes: true },
      orderBy: { createdAt: "desc" }, take: 10,
    }),
    prisma.route.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  const totalCo2  = recentRoutes.reduce((s,r)=>s+r.co2, 0);
  const totalCost = recentRoutes.reduce((s,r)=>s+r.cost, 0);
  const totalDist = recentRoutes.reduce((s,r)=>s+r.distance, 0);

  // Orders by day (7 ngày)
  const ordersByDay = await Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start7); d.setDate(start7.getDate() + i);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      return prisma.order.count({ where: { date: { gte: d, lt: next } } })
        .then(count => ({ date: d.toISOString().slice(0,10), count }));
    })
  );

  return NextResponse.json({
    totalOrders, pendingOrders, availableVehicles, deliveredOrders,
    totalCo2:  +totalCo2.toFixed(2),
    totalCost: +totalCost.toFixed(2),
    totalDist: +totalDist.toFixed(2),
    totalPlans: plans.length,
    ordersByDay,
  });
}
