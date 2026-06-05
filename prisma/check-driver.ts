import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Kiểm tra User Nguyễn Xuân Thái
  const users = await prisma.user.findMany({
    where: { role: "DRIVER" },
    include: { driver: { include: { vehicle: { select: { plate: true } } } } },
  });
  console.log("=== DRIVER USERS ===");
  users.forEach(u => {
    console.log(`User: ${u.name} (${u.email}) id=${u.id}`);
    console.log(`  Driver record: ${u.driver ? JSON.stringify({ id: u.driver.id, name: u.driver.name, userId: u.driver.userId, vehicles: u.driver.vehicle.map(v => v.plate) }) : "NULL - KHÔNG CÓ DRIVER RECORD!"}`);
  });

  // Kiểm tra tất cả Driver records
  const drivers = await prisma.driver.findMany({
    include: { vehicle: { select: { plate: true } } },
  });
  console.log("\n=== ALL DRIVER RECORDS ===");
  drivers.forEach(d => {
    console.log(`Driver: ${d.name} | userId=${d.userId ?? "NULL"} | vehicles=${d.vehicle.map(v => v.plate).join(",") || "none"}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
