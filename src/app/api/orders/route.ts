import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/orders
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const date   = searchParams.get("date");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (date) {
    const d = new Date(date);
    where.date = { gte: d, lt: new Date(d.getTime() + 86400000) };
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(orders);
}

// POST /api/orders — tạo đơn mới
export async function POST(req: NextRequest) {
  const body = await req.json();

  const order = await prisma.order.create({
    data: {
      customerName: body.customerName,
      phone:        body.phone ?? null,
      address:      body.address,
      lat:          body.lat,
      lng:          body.lng,
      demandKg:     body.demandKg,
      twStart:      body.twStart,
      twEnd:        body.twEnd,
      serviceMin:   body.serviceMin ?? 10,
      status:       "PENDING",
      date:         body.date ? new Date(body.date) : new Date(),
    },
  });

  return NextResponse.json(order, { status: 201 });
}
