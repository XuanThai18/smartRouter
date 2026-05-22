import { z } from "zod";

export const CreateOrderSchema = z.object({
  customerName: z.string().min(1, "Tên khách hàng không được để trống"),
  phone: z.string().optional(),
  address: z.string().min(5, "Địa chỉ phải có ít nhất 5 ký tự"),
  lat: z.number({ required_error: "lat là bắt buộc" }).min(-90).max(90),
  lng: z.number({ required_error: "lng là bắt buộc" }).min(-180).max(180),
  demandKg: z.number().positive("Khối lượng phải > 0"),
  twStart: z.number().int().min(0).max(1440, "twStart phải trong khoảng 0-1440"),
  twEnd: z.number().int().min(0).max(1440, "twEnd phải trong khoảng 0-1440"),
  serviceMin: z.number().int().min(0).default(10),
  date: z.string().optional(),
}).refine((d) => d.twEnd > d.twStart, {
  message: "twEnd phải lớn hơn twStart",
  path: ["twEnd"],
});

export const UpdateOrderSchema = z.object({
  customerName: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().min(5).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  demandKg: z.number().positive().optional(),
  twStart: z.number().int().min(0).max(1440).optional(),
  twEnd: z.number().int().min(0).max(1440).optional(),
  serviceMin: z.number().int().min(0).optional(),
  status: z.enum(["PENDING", "ASSIGNED", "IN_TRANSIT", "DELIVERED", "FAILED"]).optional(),
});

export const ImportOrderRowSchema = z.object({
  customerName: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().min(5),
  demandKg: z.number().positive().default(10),
  twStart: z.number().int().min(0).max(1440).default(480),
  twEnd: z.number().int().min(0).max(1440).default(720),
  serviceMin: z.number().int().min(0).default(10),
});

export const ImportOrdersSchema = z.array(ImportOrderRowSchema).min(1, "Cần ít nhất 1 đơn hàng");

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>;
export type ImportOrderRow = z.infer<typeof ImportOrderRowSchema>;
