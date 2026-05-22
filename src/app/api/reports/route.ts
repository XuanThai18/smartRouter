import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  const now   = new Date();
  const start = new Date(now); start.setDate(now.getDate()-6); start.setHours(0,0,0,0);

  const [routes, planCount, orderCount, deliveredCount] = await Promise.all([
    prisma.route.findMany({
      where: { createdAt: { gte: start } },
      include: { plan: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.routePlan.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: "DELIVERED" } }),
  ]);

  // Group by day
  const byDay: Record<string,{cost:number;co2:number;orders:number;km:number}> = {};
  for (let i=0;i<7;i++){
    const d=new Date(start); d.setDate(start.getDate()+i);
    byDay[d.toISOString().slice(0,10)] = {cost:0,co2:0,orders:0,km:0};
  }
  for (const r of routes){
    const day = r.createdAt.toISOString().slice(0,10);
    if (byDay[day]){
      byDay[day].cost += r.cost;
      byDay[day].co2  += r.co2;
      byDay[day].km   += r.distance;
    }
  }

  // Order counts per day
  const ordersByDay = await Promise.all(
    Object.keys(byDay).map(async day=>{
      const d = new Date(day); const next = new Date(d); next.setDate(d.getDate()+1);
      const count = await prisma.order.count({ where:{date:{gte:d,lt:next}} });
      return { ...byDay[day], date:day, orders:count };
    })
  );

  const totalCo2  = routes.reduce((s,r)=>s+r.co2,0);
  const totalCost = routes.reduce((s,r)=>s+r.cost,0);
  const totalKm   = routes.reduce((s,r)=>s+r.distance,0);

  // Get convergence from latest plan's paretoFront
  const latestPlan = await prisma.routePlan.findFirst({
    orderBy:{createdAt:"desc"}, where:{status:{in:["READY","DISPATCHED","COMPLETED"]}}
  });

  return NextResponse.json({
    weekly: ordersByDay,
    totals: { co2:+totalCo2.toFixed(2), cost:+totalCost.toFixed(2), km:+totalKm.toFixed(2), plans:planCount, orders:orderCount, delivered:deliveredCount },
    latestParetoSize: Array.isArray((latestPlan?.paretoFront as unknown[])) ? (latestPlan?.paretoFront as unknown[]).length : 0,
  });
}
