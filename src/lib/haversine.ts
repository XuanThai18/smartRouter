/**
 * SmartRoute — Haversine Distance Utility
 * Tính khoảng cách thực trên mặt cầu giữa 2 tọa độ WGS-84.
 */

import { EARTH_RADIUS_KM, VEHICLE_SPEED_KMH } from "./constants";

/** Khoảng cách Haversine (km) giữa 2 điểm lat/lng */
export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Thời gian di chuyển (phút) từ khoảng cách (km)
 * sử dụng tốc độ trung bình đô thị
 */
export function travelTimeMin(distKm: number): number {
  return (distKm / VEHICLE_SPEED_KMH) * 60;
}

/** Xây dựng ma trận khoảng cách (km) cho N điểm + 1 depot (index 0) */
export function buildDistMatrix(
  depot: { lat: number; lng: number },
  customers: Array<{ lat: number; lng: number }>
): number[][] {
  const n = customers.length;
  const nodes = [depot, ...customers];
  return Array.from({ length: n + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => {
      if (i === j) return 0;
      return haversine(nodes[i].lat, nodes[i].lng, nodes[j].lat, nodes[j].lng);
    })
  );
}
