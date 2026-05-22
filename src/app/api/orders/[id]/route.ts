import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/orders/[id]
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { routeStop: { include: { route: { include: { plan: true, vehicle: true } } } } },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

// PUT /api/orders/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const order = await prisma.order.update({
    where: { id: params.id },
    data: {
      customerName: body.customerName,
      phone:        body.phone,
      address:      body.address,
      lat:          body.lat,
      lng:          body.lng,
      demandKg:     body.demandKg,
      twStart:      body.twStart,
      twEnd:        body.twEnd,
      serviceMin:   body.serviceMin,
      status:       body.status,
    },
  });
  return NextResponse.json(order);
}

// DELETE /api/orders/[id]
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.order.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
