/**
 * SmartRoute — Shared API & Domain Types
 * Dùng chung giữa frontend và backend để đảm bảo type-safety end-to-end.
 */

// ── API Response Wrappers ─────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
  ok: true;
}

export interface ApiError {
  ok: false;
  error: string;
  details?: Record<string, string[]>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Domain Enums (mirrors Prisma enums) ───────────────────────────────────────

export type OrderStatus =
  | "PENDING"
  | "ASSIGNED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED";

export type VehicleStatus = "AVAILABLE" | "ON_ROUTE" | "MAINTENANCE";

export type PlanStatus =
  | "DRAFT"
  | "OPTIMIZING"
  | "READY"
  | "DISPATCHED"
  | "COMPLETED";

export type StopStatus = "PENDING" | "ARRIVED" | "DELIVERED" | "FAILED";

export type OptimizeMode = "nsga2" | "weighted";

// ── Optimize API ──────────────────────────────────────────────────────────────

export interface OptimizeRequest {
  date: string;               // "YYYY-MM-DD"
  depotLat?: number;
  depotLng?: number;
  populationSize?: number;
  generations?: number;
  mode?: OptimizeMode;
  w_dist?: number;
  w_co2?: number;
  w_cost?: number;
}

export interface OptimizeResponse {
  planId: string;
  paretoSize: number;
  feasible: number;
  pareto: ParetoPointDTO[];
  history: ConvergenceEntry[];
}

export interface ParetoPointDTO {
  totalDistance: number;
  totalCo2: number;
  totalCost: number;
  totalViolations: number;
  feasible: boolean;
  generation: number;
  routes: RouteResultDTO[];
}

export interface RouteResultDTO {
  vehicleId: string;
  customerSequence: string[];
  distance: number;
  co2: number;
  cost: number;
  loadUsed: number;
  timeUsed: number;
  feasible: boolean;
  violations: number;
}

export interface ConvergenceEntry {
  gen: number;
  bestFitness: number;
  feasibleCount: number;
  paretoSize: number;
}

// ── Orders ────────────────────────────────────────────────────────────────────

export interface CreateOrderDTO {
  customerName: string;
  phone?: string;
  address: string;
  lat: number;
  lng: number;
  demandKg: number;
  twStart: number;
  twEnd: number;
  serviceMin?: number;
  date?: string;
}

export interface UpdateOrderDTO extends Partial<CreateOrderDTO> {
  status?: OrderStatus;
}

// ── Vehicles ──────────────────────────────────────────────────────────────────

export interface CreateVehicleDTO {
  plate: string;
  name: string;
  capacityKg: number;
  costPerKm?: number;
  emissionPerKm?: number;
}
