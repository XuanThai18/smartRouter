import { z } from "zod";

// ── Base object (ZodObject — có .partial() và .extend()) ──────────────────────
const DriverBaseSchema = z.object({
  name:      z.string().min(2, "Tên tài xế phải có ít nhất 2 ký tự").max(100),
  phone:     z.string().min(9, "Số điện thoại không hợp lệ").max(15),
  licenseNo: z.string().max(50).optional(),
  status:    z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).default("ACTIVE"),
  // Cấp tài khoản đăng nhập ngay khi tạo (không bắt buộc — có thể cấp sau)
  email:    z.string().email("Email không hợp lệ").optional(),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự").optional(),
});

// ── CreateDriverSchema — thêm refine sau khi đã có ZodObject ─────────────────
export const CreateDriverSchema = DriverBaseSchema.refine(
  data => (!data.email && !data.password) || (data.email && data.password),
  { message: "Phải nhập cả email và mật khẩu nếu muốn cấp tài khoản", path: ["email"] }
);

// ── UpdateDriverSchema — .partial() gọi trên ZodObject (base), không phải ZodEffects
export const UpdateDriverSchema = DriverBaseSchema.partial().extend({
  vehicleId: z.string().cuid().optional().nullable(),
});

export type CreateDriverInput = z.infer<typeof CreateDriverSchema>;
export type UpdateDriverInput = z.infer<typeof UpdateDriverSchema>;
