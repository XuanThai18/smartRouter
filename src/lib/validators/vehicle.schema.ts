import { z } from "zod";

export const CreateVehicleSchema = z.object({
  plate: z.string().min(5, "Biển số xe phải có ít nhất 5 ký tự").toUpperCase(),
  name: z.string().min(1, "Tên xe không được để trống"),
  capacityKg: z.number().positive("Tải trọng phải > 0"),
  costPerKm: z.number().positive().default(2.0),
  emissionPerKm: z.number().positive().default(0.21),
});

export const UpdateVehicleSchema = z.object({
  plate: z.string().min(5).optional(),
  name: z.string().min(1).optional(),
  capacityKg: z.number().positive().optional(),
  costPerKm: z.number().positive().optional(),
  emissionPerKm: z.number().positive().optional(),
  status: z.enum(["AVAILABLE", "ON_ROUTE", "MAINTENANCE"]).optional(),
  driverId: z.string().nullable().optional(),
});

export type CreateVehicleInput = z.infer<typeof CreateVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof UpdateVehicleSchema>;
