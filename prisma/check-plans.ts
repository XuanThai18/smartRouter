import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Kiểm tra tất cả RoutePlan hiện tại
  const plans = await prisma.routePlan.findMany({
    include: {
      routes: {
        include: { vehicle: { select: { plate: true, driverId: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  console.log(`=== ${plans.length} ROUTE PLAN(S) GẦN NHẤT ===`);
  plans.forEach(p => {
    console.log(`Plan id=${p.id} | date=${p.date.toISOString().slice(0,10)} | status=${p.status}`);
    p.routes.forEach(r => {
      console.log(`  Route id=${r.id} | vehicle=${r.vehicle.plate} | driverId=${r.vehicle.driverId ?? "NULL"}`);
    });
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
