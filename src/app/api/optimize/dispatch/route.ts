import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// POST /api/optimize/dispatch — chốt phương án, đổi plan sang DISPATCHED
export async function POST(req: NextRequest) {
  const { planId, selectedIdx = 0 } = await req.json();

  const plan = await prisma.routePlan.update({
    where: { id: planId },
    data:  { status: "DISPATCHED", selectedIdx },
    include: {
      routes: {
        include: {
          vehicle: true,
          stops: { include: { order: true }, orderBy: { position: "asc" } },
        },
      },
    },
  });

  // Update vehicles to ON_ROUTE
  for (const route of plan.routes) {
    if (route.stops.length === 0) continue;
    await prisma.vehicle.update({
      where: { id: route.vehicleId },
      data:  { status: "ON_ROUTE" },
    });
  }

  return NextResponse.json({ ok: true, plan });
}
