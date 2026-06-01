import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import PDFDocument from "pdfkit";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return new Response("Unauthorized", { status: 403 });
    }

    const { searchParams } = req.nextUrl;
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");

    let dateFilter = {};
    if (fromStr && toStr) {
      dateFilter = {
        date: {
          gte: new Date(fromStr),
          lte: new Date(new Date(toStr).setHours(23, 59, 59, 999)),
        },
      };
    }

    // Lấy dữ liệu cho báo cáo
    const plans = await prisma.routePlan.findMany({
      where: dateFilter,
      include: {
        routes: true,
      },
    });

    const totalPlans = plans.length;
    let totalCost = 0;
    let totalDistance = 0;
    let totalCo2 = 0;

    for (const p of plans) {
      for (const r of p.routes) {
        totalCost += r.cost;
        totalDistance += r.distance;
        totalCo2 += r.co2;
      }
    }

    // Tạo PDF buffer
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];
        
        doc.on("data", (chunk) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header
        doc.fontSize(20).text("Báo Cáo Hoạt Động SmartRoute", { align: "center" });
        doc.moveDown(1);
        
        doc.fontSize(12).text(`Ngày xuất báo cáo: ${new Date().toLocaleDateString("vi-VN")}`, { align: "center" });
        doc.moveDown(2);

        // KPI Summary
        doc.fontSize(16).text("Tóm tắt KPI");
        doc.moveDown(0.5);
        doc.fontSize(12)
          .text(`- Tổng số kế hoạch tối ưu: ${totalPlans}`)
          .text(`- Tổng khoảng cách: ${totalDistance.toFixed(2)} km`)
          .text(`- Tổng lượng CO2 phát thải: ${totalCo2.toFixed(2)} kg`)
          .text(`- Tổng chi phí ước tính: $${totalCost.toFixed(2)}`);
          
        doc.moveDown(2);

        // Chi tiết (ví dụ)
        doc.fontSize(16).text("Chi tiết");
        doc.moveDown(0.5);
        doc.fontSize(12).text("Dữ liệu chi tiết hơn sẽ được trình bày dưới dạng bảng ở các phiên bản tiếp theo.", { align: "justify" });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="smartroute_report_${Date.now()}.pdf"`,
      },
    });

  } catch (err) {
    console.error("Lỗi export PDF:", err);
    return new Response("Lỗi server", { status: 500 });
  }
}
