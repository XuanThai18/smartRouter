// @ts-nocheck  ← bỏ nếu muốn strict type check
import { PrismaClient, VehicleStatus, OrderStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ── Vehicles ──────────────────────────────────────────────────────────────
  await prisma.vehicle.createMany({
    data: [
      { plate: "51A-12345", name: "Xe tải nhỏ A",  capacityKg: 500,  costPerKm: 1.8, emissionPerKm: 0.18, status: VehicleStatus.AVAILABLE },
      { plate: "51B-67890", name: "Xe tải nhỏ B",  capacityKg: 750,  costPerKm: 2.2, emissionPerKm: 0.22, status: VehicleStatus.AVAILABLE },
      { plate: "51C-11111", name: "Xe van C",       capacityKg: 300,  costPerKm: 1.5, emissionPerKm: 0.15, status: VehicleStatus.AVAILABLE },
      { plate: "51D-22222", name: "Xe tải lớn D",   capacityKg: 1200, costPerKm: 3.0, emissionPerKm: 0.30, status: VehicleStatus.AVAILABLE },
    ],
    skipDuplicates: true,
  });

  // ── Orders (tọa độ thật TP.HCM) ───────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sampleOrders = [
    { customerName: "Công ty ABC",    phone: "0901234567", address: "227 Nguyễn Văn Cừ, Quận 5, TP.HCM",        lat: 10.7527, lng: 106.6804, demandKg: 45,  twStart: 480, twEnd: 720  },
    { customerName: "Shop XYZ",       phone: "0912345678", address: "1 Nguyễn Huệ, Quận 1, TP.HCM",              lat: 10.7734, lng: 106.7030, demandKg: 20,  twStart: 540, twEnd: 780  },
    { customerName: "Cty Thương Mại", phone: "0923456789", address: "15 Trần Hưng Đạo, Quận 1, TP.HCM",          lat: 10.7654, lng: 106.6937, demandKg: 80,  twStart: 360, twEnd: 600  },
    { customerName: "Nhà hàng BCD",   phone: "0934567890", address: "100 Lê Văn Việt, Quận 9, TP.HCM",           lat: 10.8490, lng: 106.7800, demandKg: 30,  twStart: 480, twEnd: 720  },
    { customerName: "Siêu thị EFG",   phone: "0945678901", address: "678 Điện Biên Phủ, Bình Thạnh, TP.HCM",    lat: 10.8120, lng: 106.7150, demandKg: 150, twStart: 420, twEnd: 660  },
    { customerName: "Kho HIJ",        phone: "0956789012", address: "45 Nguyễn Thị Thập, Quận 7, TP.HCM",       lat: 10.7330, lng: 106.7210, demandKg: 90,  twStart: 540, twEnd: 780  },
    { customerName: "Cửa hàng KLM",   phone: "0967890123", address: "200 Cộng Hòa, Tân Bình, TP.HCM",            lat: 10.8030, lng: 106.6640, demandKg: 35,  twStart: 480, twEnd: 720  },
    { customerName: "Đại lý NOP",     phone: "0978901234", address: "300 Nguyễn Văn Linh, Bình Chánh, TP.HCM",  lat: 10.7100, lng: 106.6280, demandKg: 200, twStart: 360, twEnd: 600  },
  ];

  for (const o of sampleOrders) {
    await prisma.order.upsert({
      where:  { code: `SEED-${o.phone}` },
      update: {},
      create: {
        code:     `SEED-${o.phone}`,
        ...o,
        serviceMin: 10,
        status: OrderStatus.PENDING,
        date: today,
      },
    });
  }

  console.log("Seed data created successfully!");
}

main()
  .catch(e => { console.error("Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
