import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const driver = await prisma.driver.findFirst({
    where: { user: { email: "nguyenxuanthai1811@gmail.com" } },
    include: { vehicle: true }
  });
  console.log("Driver:", driver);
  
  if (!driver) return;

  const vehicleIds = driver.vehicle.map(v => v.id);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    const routes = await prisma.route.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        plan: {
          date:   { gte: today, lt: tomorrow },
          status: { in: ["READY", "DISPATCHED", "COMPLETED"] },
        },
      },
      include: {
        vehicle: { select: { plate: true, name: true } },
        stops: {
          include: {
            order: {
              select: {
                id:           true,
                customerName: true,
                address:      true,
                phone:        true,
                demandKg:     true,
              },
            },
          },
          orderBy: { position: "asc" },
        },
      },
    });
    console.log("Routes count:", routes.length);
  } catch (err) {
    console.error("Lỗi Prisma:", err);
  }
}

main().finally(() => prisma.$disconnect());
