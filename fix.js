const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const orders = await prisma.order.findMany();
  let updated = 0;
  for (const o of orders) {
    if (Math.abs(o.lat - 10.7769) < 0.0001 && Math.abs(o.lng - 106.7009) < 0.0001) {
      const newLat = 10.7769 + (Math.random() - 0.5) * 0.1;
      const newLng = 106.7009 + (Math.random() - 0.5) * 0.1;
      await prisma.order.update({
        where: { id: o.id },
        data: { lat: newLat, lng: newLng }
      });
      updated++;
    }
  }
  console.log(`Updated ${updated} orders`);

  const deletedPlans = await prisma.routePlan.deleteMany();
  console.log(`Deleted ${deletedPlans.count} plans. Please re-run optimize.`);
}

run().finally(() => prisma.$disconnect());
