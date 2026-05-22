import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// POST /api/orders/import — batch import với geocoding
export async function POST(req: NextRequest) {
  const rows: Array<{
    customerName: string; phone?: string; address: string;
    demandKg: number; twStart: number; twEnd: number; serviceMin?: number;
  }> = await req.json();

  let success = 0;
  let failed  = 0;

  for (const row of rows) {
    try {
      // Nominatim geocoding
      await new Promise(r => setTimeout(r, 1100)); // rate limit 1 req/s
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(row.address + ", Vietnam")}&format=json&limit=1`,
        { headers: { "User-Agent": process.env.NOMINATIM_USER_AGENT ?? "SmartRoute-ERP/1.0" } }
      ).then(r => r.json());

      const lat = geo?.[0]?.lat ? parseFloat(geo[0].lat) : 10.7769;
      const lng = geo?.[0]?.lon ? parseFloat(geo[0].lon) : 106.7009;

      await prisma.order.create({
        data: {
          customerName: row.customerName,
          phone:        row.phone ?? null,
          address:      row.address,
          lat, lng,
          demandKg:   row.demandKg,
          twStart:    row.twStart,
          twEnd:      row.twEnd,
          serviceMin: row.serviceMin ?? 10,
          status:     "PENDING",
          date:       new Date(),
        },
      });
      success++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ success, failed });
}
