import { NextRequest } from "next/server";
import { ZodError } from "zod";
import prisma from "@/lib/db";
import { ok, created, serverError, validationError } from "@/lib/api";
import { CreateVehicleSchema } from "@/lib/validators/vehicle.schema";

// ── GET /api/vehicles ─────────────────────────────────────────────────────────
export async function GET() {
  try {
    const vehicles = await prisma.vehicle.findMany({
      orderBy: { createdAt: "asc" },
      include: { driver: true },
    });
    return ok(vehicles);
  } catch (err) {
    return serverError("Lỗi khi lấy danh sách xe", err);
  }
}

// ── POST /api/vehicles ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateVehicleSchema.parse(body);

    const vehicle = await prisma.vehicle.create({
      data: {
        plate:         parsed.plate,
        name:          parsed.name,
        capacityKg:    parsed.capacityKg,
        costPerKm:     parsed.costPerKm,
        emissionPerKm: parsed.emissionPerKm,
        status:        "AVAILABLE",
      },
    });
    return created(vehicle);
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    // Unique constraint (biển số trùng)
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "P2002"
    ) {
      return validationError(new ZodError([{
        code: "custom",
        path: ["plate"],
        message: "Biển số xe đã tồn tại trong hệ thống",
      }]));
    }
    return serverError("Lỗi khi tạo xe", err);
  }
}
