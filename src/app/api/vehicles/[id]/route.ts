import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const v = await prisma.vehicle.update({ where: { id: params.id }, data: body });
  return NextResponse.json(v);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.vehicle.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
