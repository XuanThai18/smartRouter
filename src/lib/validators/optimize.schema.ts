import { z } from "zod";
import { ENGINE_DEFAULTS } from "@/lib/constants";

export const OptimizeSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có định dạng YYYY-MM-DD"),
  depotLat: z.number().min(-90).max(90).default(10.7769),
  depotLng: z.number().min(-180).max(180).default(106.7009),
  populationSize: z
    .number()
    .int()
    .min(20, "Quần thể tối thiểu 20")
    .max(500, "Quần thể tối đa 500")
    .default(ENGINE_DEFAULTS.populationSize),
  generations: z
    .number()
    .int()
    .min(10, "Tối thiểu 10 thế hệ")
    .max(1000, "Tối đa 1000 thế hệ")
    .default(ENGINE_DEFAULTS.generations),
  mode: z.enum(["nsga2", "weighted"]).default("nsga2"),
  w_dist: z.number().min(0).max(1).default(ENGINE_DEFAULTS.w_dist),
  w_co2: z.number().min(0).max(1).default(ENGINE_DEFAULTS.w_co2),
  w_cost: z.number().min(0).max(1).default(ENGINE_DEFAULTS.w_cost),
});

export const DispatchSchema = z.object({
  planId: z.string().min(1, "planId không được để trống"),
  selectedIdx: z.number().int().min(0).default(0),
});

export const CompleteSchema = z.object({
  planId: z.string().min(1, "planId không được để trống"),
});

export type OptimizeInput = z.infer<typeof OptimizeSchema>;
export type DispatchInput = z.infer<typeof DispatchSchema>;
export type CompleteInput = z.infer<typeof CompleteSchema>;
