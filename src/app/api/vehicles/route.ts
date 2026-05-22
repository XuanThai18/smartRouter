import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/vehicles
export async function GET() {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { createdAt: "asc" },
    include: { driver: true },
  });
  return NextResponse.json(vehicles);
}

// POST /api/vehicles
export async function POST(req: NextRequest) {
  const body = await req.json();
  const v = await prisma.vehicle.create({
    data: {
      plate:         body.plate,
      name:          body.name,
      capacityKg:    body.capacityKg,
      costPerKm:     body.costPerKm    ?? 2.0,
      emissionPerKm: body.emissionPerKm ?? 0.21,
      status:        "AVAILABLE",
    },
  });
  return NextResponse.json(v, { status: 201 });
}
