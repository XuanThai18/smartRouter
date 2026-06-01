import { z } from "zod";

export const CreateDriverSchema = z.object({
  name:      z.string().min(2, "Tên tài xế phải có ít nhất 2 ký tự").max(100),
  phone:     z.string().min(9, "Số điện thoại không hợp lệ").max(15),
  licenseNo: z.string().max(50).optional(),
  status:    z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).default("ACTIVE"),
});

export const UpdateDriverSchema = CreateDriverSchema.partial().extend({
  vehicleId: z.string().cuid().optional().nullable(),
});

export type CreateDriverInput = z.infer<typeof CreateDriverSchema>;
export type UpdateDriverInput = z.infer<typeof UpdateDriverSchema>;
