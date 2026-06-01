import { NextRequest } from "next/server";
import { ZodError } from "zod";
import prisma from "@/lib/db";
import { ok, badRequest, serverError, validationError } from "@/lib/api";
import { OptimizeSchema } from "@/lib/validators/optimize.schema";
import { addOptimizeJob } from "@/lib/queue";

/**
 * POST /api/optimize
 *
 * Validate cấu hình, kiểm tra trước (có đơn hàng + có xe không), sau đó
 * đẩy job vào BullMQ Queue và trả về jobId ngay lập tức (202 Accepted).
 * Frontend dùng jobId này để poll /api/optimize/status hoặc lắng nghe SSE.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config = OptimizeSchema.parse(body);
    const { date, depotLat = 10.7769, depotLng = 106.7009 } = config;

    // Pre-flight checks — trả lỗi ngay nếu không có dữ liệu (tránh tạo job vô ích)
    const d = new Date(date);
    const orderCount = await prisma.order.count({
      where: {
        status: "PENDING",
        date: { gte: d, lt: new Date(d.getTime() + 86_400_000) },
      },
    });

    if (orderCount === 0) {
      return badRequest("Không có đơn hàng PENDING cho ngày này");
    }

    const vehicleCount = await prisma.vehicle.count({
      where: { status: "AVAILABLE" },
    });

    if (vehicleCount === 0) {
      return badRequest("Không có xe nào khả dụng");
    }

    // Tạo bản ghi RoutePlan với status OPTIMIZING để tracking
    const plan = await prisma.routePlan.create({
      data: {
        date: d,
        status: "OPTIMIZING",
        algoConfig: {
          mode: config.mode,
          populationSize: config.populationSize,
          generations: config.generations,
          w_dist: config.w_dist,
          w_co2: config.w_co2,
          w_cost: config.w_cost,
          depotLat,
          depotLng,
        },
        paretoFront: [],
        selectedIdx: 0,
      },
    });

    // Đẩy job vào Queue — Worker sẽ xử lý bất đồng bộ
    const jobId = await addOptimizeJob({
      ...config,
      depotLat,
      depotLng,
      _planId: plan.id, // Truyền planId để Worker update thay vì tạo mới
    } as any);

    // Trả về 202 Accepted + jobId để Frontend polling/SSE
    return new Response(
      JSON.stringify({ ok: true, data: { jobId, planId: plan.id } }),
      { status: 202, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    return serverError("Lỗi khi tạo job tối ưu hóa", err);
  }
}

/**
 * GET /api/optimize
 * Lấy danh sách RoutePlans gần nhất (giữ nguyên)
 */
export async function GET() {
  try {
    const plans = await prisma.routePlan.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        routes: {
          include: {
            vehicle: true,
            stops: {
              include: { order: true },
              orderBy: { position: "asc" },
            },
          },
        },
      },
    });
    return ok(plans);
  } catch (err) {
    return serverError("Lỗi khi lấy danh sách kế hoạch", err);
  }
}
