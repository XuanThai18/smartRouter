import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "SmartRoute ERP — Hệ thống tối ưu logistics",
  description: "Tối ưu lộ trình giao hàng đa mục tiêu với thuật toán NSGA-II. Quản lý đội xe, đơn hàng và điều phối thông minh.",
  keywords: ["logistics", "NSGA-II", "VRP", "route optimization", "ERP"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
