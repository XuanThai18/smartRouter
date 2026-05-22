/**
 * SmartRoute — Algorithm Engine Factory
 *
 * Public API cho optimization engines. Import từ đây thay vì import trực tiếp
 * từ engine.ts hoặc weighted.ts.
 *
 * @example
 * ```ts
 * import { createEngine } from "@/lib/nsga2";
 *
 * const result = await createEngine("nsga2", customers, vehicles, depot, opts).run();
 * const result = await createEngine("weighted", customers, vehicles, depot, opts).run();
 * ```
 */

export type { CustomerNode, VehicleConfig, DepotConfig, RouteResult, SolutionResult, ParetoPoint, ConvergenceEntry, EngineOptions } from "./engine";
export type { WeightedResult } from "./weighted";
export { NSGAEngine } from "./engine";
export { WeightedEngine } from "./weighted";

import { NSGAEngine, type EngineOptions } from "./engine";
import type { CustomerNode } from "./engine";
import type { VehicleConfig } from "./engine";
import type { DepotConfig } from "./engine";
import { WeightedEngine } from "./weighted";

export type OptimizeMode = "nsga2" | "weighted";

export type AnyEngine = NSGAEngine | WeightedEngine;

/**
 * Factory function — trả về engine phù hợp với mode đã chọn.
 * Gọi `.run()` trên kết quả để chạy thuật toán.
 */
export function createEngine(
  mode: OptimizeMode,
  customers: CustomerNode[],
  vehicles: VehicleConfig[],
  depot: DepotConfig,
  options: EngineOptions = {}
): AnyEngine {
  if (mode === "weighted") {
    return new WeightedEngine(customers, vehicles, depot, options);
  }
  return new NSGAEngine(customers, vehicles, depot, options);
}

/** Type guard để kiểm tra engine mode */
export function isNSGAEngine(engine: AnyEngine): engine is NSGAEngine {
  return engine instanceof NSGAEngine;
}
