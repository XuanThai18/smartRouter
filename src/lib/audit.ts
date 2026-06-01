import prisma from "./db";

type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "LOGIN";

export async function logAudit(
  userId: string,
  action: AuditAction,
  entity: string,
  entityId: string,
  meta?: Record<string, any>
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        meta: meta || {},
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
