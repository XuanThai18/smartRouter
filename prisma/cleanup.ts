/**
 * Cleanup script: Xóa toàn bộ RoutePlan/Route/RouteStop cũ và
 * reset trạng thái xe + đơn hàng về trạng thái ban đầu.
 * Chạy: npx tsx prisma/cleanup.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Bắt đầu dọn dẹp dữ liệu cũ...\n");

  // 1. Xóa tất cả RouteStop → Route → RoutePlan (cascade)
  const deletedPlans = await prisma.routePlan.deleteMany({});
  console.log(`✅ Đã xóa ${deletedPlans.count} RoutePlan (và tất cả Route/Stop liên quan)`);

  // 2. Reset đơn hàng về PENDING (những đơn bị đổi sang ASSIGNED/IN_TRANSIT)
  const resetOrders = await prisma.order.updateMany({
    where: { status: { in: ["ASSIGNED", "IN_TRANSIT"] } },
    data:  { status: "PENDING" },
  });
  console.log(`✅ Đã reset ${resetOrders.count} đơn hàng về trạng thái PENDING`);

  // 3. Reset xe về AVAILABLE — đặc biệt xe không có tài xế phải về AVAILABLE
  const resetVehicles = await prisma.vehicle.updateMany({
    where: { status: "ON_ROUTE" },
    data:  { status: "AVAILABLE" },
  });
  console.log(`✅ Đã reset ${resetVehicles.count} xe về trạng thái AVAILABLE`);

  // 4. Kiểm tra lại: liệt kê xe nào ĐỦ điều kiện chạy AI (có tài xế + AVAILABLE)
  const eligibleVehicles = await prisma.vehicle.findMany({
    where: { status: "AVAILABLE", driverId: { not: null } },
    select: { plate: true, name: true, driver: { select: { name: true } } },
  });

  console.log(`\n📋 Xe đủ điều kiện chạy NSGA-II sau cleanup (${eligibleVehicles.length} xe):`);
  if (eligibleVehicles.length === 0) {
    console.log("   ⚠️  Không có xe nào! Hãy gán tài xế cho xe trước khi tối ưu.");
  } else {
    eligibleVehicles.forEach(v =>
      console.log(`   ✅ ${v.plate} — ${v.name} (Tài xế: ${v.driver?.name ?? "??"})`)
    );
  }

  const ineligibleVehicles = await prisma.vehicle.findMany({
    where: { status: "AVAILABLE", driverId: null },
    select: { plate: true, name: true },
  });
  if (ineligibleVehicles.length > 0) {
    console.log(`\n🚫 Xe KHÔNG đủ điều kiện (chưa gán tài xế — ${ineligibleVehicles.length} xe):`);
    ineligibleVehicles.forEach(v =>
      console.log(`   ❌ ${v.plate} — ${v.name}`)
    );
  }

  console.log("\n✨ Dọn dẹp hoàn tất!");
}

main()
  .catch(e => { console.error("Lỗi cleanup:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
