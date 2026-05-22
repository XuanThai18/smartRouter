import { NextRequest } from "next/server";
import { ZodError } from "zod";
import prisma from "@/lib/db";
import { ok, badRequest, serverError, validationError } from "@/lib/api";
import { ImportOrdersSchema } from "@/lib/validators/order.schema";
import { NOMINATIM_DELAY_MS, NOMINATIM_USER_AGENT, DEFAULT_DEPOT } from "@/lib/constants";

/**
 * Geocode một địa chỉ qua Nominatim.
 * Trả về { lat, lng } hoặc depot mặc định nếu không tìm thấy.
 */
async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number; found: boolean }> {
  const url =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(address + ", Hồ Chí Minh")}&limit=1`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return { ...DEFAULT_DEPOT, found: false };

    const data = await res.json();
    if (!data?.features?.[0]?.geometry?.coordinates) {
      return { ...DEFAULT_DEPOT, found: false };
    }

    const coords = data.features[0].geometry.coordinates;
    return {
      lat: coords[1],
      lng: coords[0],
      found: true,
    };
  } catch {
    return { ...DEFAULT_DEPOT, found: false };
  }
}

// ── POST /api/orders/import ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows = ImportOrdersSchema.parse(body);

    let success = 0;
    let failed = 0;
    let geocodeFailed = 0;

    for (const row of rows) {
      try {
        // Rate limit: 1 req/s theo ToS của Nominatim
        await new Promise((r) => setTimeout(r, NOMINATIM_DELAY_MS));

        const { lat, lng, found } = await geocodeAddress(row.address);
        if (!found) geocodeFailed++;

        await prisma.order.create({
          data: {
            customerName: row.customerName,
            phone:        row.phone ?? null,
            address:      row.address,
            lat,
            lng,
            demandKg:   row.demandKg,
            twStart:    row.twStart,
            twEnd:      row.twEnd,
            serviceMin: row.serviceMin,
            status:     "PENDING",
            date:       new Date(),
          },
        });
        success++;
      } catch {
        failed++;
      }
    }

    return ok({ success, failed, geocodeFailed, total: rows.length });
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    return serverError("Lỗi khi import đơn hàng", err);
  }
}
