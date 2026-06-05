/**
 * SmartRoute — API Response Helpers
 * Chuẩn hóa tất cả API responses theo format nhất quán.
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";

// ── HTTP Status Helpers ───────────────────────────────────────────────────────

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

export function created<T>(data: T): NextResponse {
  return ok(data, 201);
}

export function notFound(message = "Không tìm thấy tài nguyên"): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status: 404 });
}

export function forbidden(message = "Không có quyền truy cập"): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status: 403 });
}

export function badRequest(
  message: string,
  details?: Record<string, string[]>
): NextResponse {
  return NextResponse.json(
    { ok: false, error: message, ...(details && { details }) },
    { status: 400 }
  );
}

export function serverError(
  message = "Lỗi máy chủ nội bộ",
  cause?: unknown
): NextResponse {
  const errMsg =
    cause instanceof Error ? cause.message : String(cause ?? "");
  console.error("[SmartRoute API Error]", message, errMsg);
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}

// ── Zod Validation Error ──────────────────────────────────────────────────────

export function validationError(err: ZodError): NextResponse {
  const details: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const path = issue.path.join(".") || "root";
    (details[path] ??= []).push(issue.message);
  }
  return badRequest("Dữ liệu không hợp lệ", details);
}

// ── Safe JSON parse ───────────────────────────────────────────────────────────

export async function parseBody<T>(
  req: Request,
  schema: { parse: (data: unknown) => T }
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const raw = await req.json();
    const data = schema.parse(raw);
    return { data };
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return { error: validationError(err as ZodError) };
    }
    return { error: badRequest("Body JSON không hợp lệ") };
  }
}
