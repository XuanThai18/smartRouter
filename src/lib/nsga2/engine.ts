/**
 * SmartRoute — NSGA-II Engine (TypeScript)
 *
 * Multi-Objective Vehicle Routing Problem solver sử dụng thuật toán tiến hóa
 * NSGA-II (Non-dominated Sorting Genetic Algorithm II).
 *
 * Mục tiêu tối ưu đồng thời:
 *   1. Tối thiểu tổng quãng đường (km)
 *   2. Tối thiểu tổng lượng CO₂ (kg)
 *   3. Tối thiểu tổng chi phí ($)
 *
 * Ràng buộc:
 *   - Time window cho từng điểm giao hàng
 *   - Tải trọng tối đa mỗi xe
 *   - Tổng thời gian làm việc mỗi xe (maxWorkMin)
 */

import {
  PENALTY_FACTOR,
  GREEDY_SEED_RATIO,
  TOURNAMENT_SIZE,
  TWO_OPT_MAX_ITER,
  ENGINE_DEFAULTS,
} from "@/lib/constants";
import { buildDistMatrix, travelTimeMin } from "@/lib/haversine";

// ── Domain Types ─────────────────────────────────────────────────────────────

export interface CustomerNode {
  id: string;
  lat: number;
  lng: number;
  demandKg: number;
  /** Mở cửa — phút từ 00:00 */
  twStart: number;
  /** Đóng cửa — phút từ 00:00 */
  twEnd: number;
  /** Thời gian phục vụ tại điểm (phút) */
  serviceMin: number;
}

export interface VehicleConfig {
  id: string;
  capacityKg: number;
  costPerKm: number;
  emissionPerKm: number;
  maxWorkMin: number;
}

export interface DepotConfig {
  lat: number;
  lng: number;
}

export interface RouteResult {
  vehicleId: string;
  /** Customer IDs theo thứ tự ghé thăm */
  customerSequence: string[];
  distance: number;   // km
  co2: number;        // kg
  cost: number;       // $
  loadUsed: number;   // kg
  timeUsed: number;   // phút
  feasible: boolean;
  violations: number;
}

export interface SolutionResult {
  routes: RouteResult[];
  totalDistance: number;
  totalCo2: number;
  totalCost: number;
  totalViolations: number;
  feasible: boolean;
}

export interface ParetoPoint extends SolutionResult {
  generation: number;
  chromosome: number[];
}

export interface ConvergenceEntry {
  gen: number;
  bestFitness: number;
  feasibleCount: number;
  paretoSize: number;
}

export interface EngineOptions {
  populationSize?: number;
  generations?: number;
  crossoverRate?: number;
  mutationRate?: number;
  w_dist?: number;
  w_co2?: number;
  w_cost?: number;
}

// ── NSGA-II Engine ────────────────────────────────────────────────────────────

export class NSGAEngine {
  private readonly customers: CustomerNode[];
  private readonly vehicles: VehicleConfig[];
  private readonly distMatrix: number[][];
  private readonly N: number;   // số customers
  private readonly K: number;   // số vehicles
  private readonly opts: Required<EngineOptions>;

  private _paretoFront: ParetoPoint[] = [];
  private _history: ConvergenceEntry[] = [];
  private population: number[][] = [];

  constructor(
    customers: CustomerNode[],
    vehicles: VehicleConfig[],
    depot: DepotConfig,
    options: EngineOptions = {}
  ) {
    this.customers = customers;
    this.vehicles = vehicles;
    this.N = customers.length;
    this.K = vehicles.length;
    this.opts = {
      populationSize: options.populationSize ?? ENGINE_DEFAULTS.populationSize,
      generations:    options.generations    ?? ENGINE_DEFAULTS.generations,
      crossoverRate:  options.crossoverRate  ?? ENGINE_DEFAULTS.crossoverRate,
      mutationRate:   options.mutationRate   ?? ENGINE_DEFAULTS.mutationRate,
      w_dist:         options.w_dist         ?? ENGINE_DEFAULTS.w_dist,
      w_co2:          options.w_co2          ?? ENGINE_DEFAULTS.w_co2,
      w_cost:         options.w_cost         ?? ENGINE_DEFAULTS.w_cost,
    };
    // Ma trận khoảng cách xây dựng một lần với depot thật
    this.distMatrix = buildDistMatrix(depot, customers);
  }

  // ── Public Getters ──────────────────────────────────────────────────────────

  get paretoFront(): Readonly<ParetoPoint[]> {
    return this._paretoFront;
  }

  get history(): Readonly<ConvergenceEntry[]> {
    return this._history;
  }

  // ── Chromosome Encoding ─────────────────────────────────────────────────────
  // Chromosome là mảng N phần tử, chromosome[i] = k nghĩa là customer i
  // được giao cho vehicle k.

  /** Khởi tạo ngẫu nhiên với Fisher-Yates shuffle */
  private randomChromosome(): number[] {
    const base = Array.from({ length: this.N }, (_, i) => i % this.K);
    for (let i = base.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [base[i], base[j]] = [base[j], base[i]];
    }
    return base;
  }

  /**
   * Khởi tạo greedy: sắp xếp customers theo twEnd tăng dần,
   * gán vào xe có tải thấp nhất còn đủ tải trọng.
   * Fix: dùng capacityKg của từng vehicle, không dùng vehicles[0].
   */
  private greedyChromosome(): number[] {
    const sorted = [...this.customers]
      .map((c, i) => ({ i, twEnd: c.twEnd, demand: c.demandKg }))
      .sort((a, b) => a.twEnd - b.twEnd);

    const chromosome = new Array<number>(this.N).fill(0);
    const vehicleLoad = new Array<number>(this.K).fill(0);

    for (const { i, demand } of sorted) {
      // Tìm xe còn đủ tải trọng và có tải nhẹ nhất
      let bestK = -1;
      let minLoad = Infinity;
      for (let k = 0; k < this.K; k++) {
        const capacity = this.vehicles[k].capacityKg;
        if (vehicleLoad[k] + demand <= capacity && vehicleLoad[k] < minLoad) {
          minLoad = vehicleLoad[k];
          bestK = k;
        }
      }
      // Fallback: xe có tải nhẹ nhất (kể cả vượt tải)
      if (bestK === -1) {
        bestK = vehicleLoad.indexOf(Math.min(...vehicleLoad));
      }
      chromosome[i] = bestK;
      vehicleLoad[bestK] += demand;
    }
    return chromosome;
  }

  /** Giải mã chromosome → Map<vehicleIdx, customerIndices[]> */
  private decode(chromosome: number[]): Map<number, number[]> {
    const assignment = new Map<number, number[]>();
    for (let k = 0; k < this.K; k++) assignment.set(k, []);
    for (let i = 0; i < this.N; i++) {
      assignment.get(chromosome[i])!.push(i);
    }
    return assignment;
  }

  /**
   * Repair: đảm bảo mỗi xe có ít nhất 1 customer (nếu K ≤ N).
   * Chuyển 1 customer từ xe đông nhất sang xe trống.
   */
  private repair(chromosome: number[]): number[] {
    const result = [...chromosome];
    const assignment = this.decode(result);
    const empty = Array.from(assignment.entries())
      .filter(([, v]) => v.length === 0)
      .map(([k]) => k);
    const full = Array.from(assignment.entries())
      .filter(([, v]) => v.length > 1)
      .sort((a, b) => b[1].length - a[1].length) // xe đông nhất trước
      .map(([k, v]) => ({ k, v }));

    for (let i = 0; i < empty.length && i < full.length; i++) {
      const from = full[i];
      // Chuyển customer ở giữa (ít ảnh hưởng nhất)
      const ci = from.v[Math.floor(from.v.length / 2)];
      result[ci] = empty[i];
    }
    return result;
  }

  // ── Route Builder (Earliest Deadline First + Nearest Neighbor) ─────────────

  private buildRoute(
    vehicle: VehicleConfig,
    customerIndices: number[]
  ): RouteResult {
    if (customerIndices.length === 0) {
      return {
        vehicleId: vehicle.id,
        customerSequence: [],
        distance: 0, co2: 0, cost: 0,
        loadUsed: 0, timeUsed: 0,
        feasible: true, violations: 0,
      };
    }

    const unvisited = new Set(customerIndices);
    const route: number[] = [];
    let currentNode = 0; // depot = index 0
    let currentTime = 0; // phút

    while (unvisited.size > 0) {
      type Candidate = { ci: number; dist: number; arrival: number; c: CustomerNode };
      const feasible: Candidate[] = [];
      const infeasible: Candidate[] = [];

      for (const ci of unvisited) {
        const c = this.customers[ci];
        const dist = this.distMatrix[currentNode][ci + 1];
        const arrival = currentTime + travelTimeMin(dist);
        (arrival <= c.twEnd ? feasible : infeasible).push({ ci, dist, arrival, c });
      }

      const pool = feasible.length > 0 ? feasible : infeasible;
      let best = pool[0];
      let bestScore = Infinity;

      for (const p of pool) {
        const score =
          p.arrival <= p.c.twEnd
            ? travelTimeMin(p.dist) * 0.6 +
              (p.c.twEnd - Math.max(p.arrival, p.c.twStart)) * 0.4
            : 1e9 + (p.arrival - p.c.twEnd);
        if (score < bestScore) {
          bestScore = score;
          best = p;
        }
      }

      const { ci, arrival, c } = best;
      currentTime = Math.max(arrival, c.twStart) + c.serviceMin;
      route.push(ci);
      unvisited.delete(ci);
      currentNode = ci + 1;
    }

    // Memetic 2-opt local search
    const optimizedRoute = this.twoOptSearch(route, vehicle);
    const ev = this.evalRouteSeq(optimizedRoute, vehicle);

    return {
      vehicleId: vehicle.id,
      customerSequence: optimizedRoute.map((ci) => this.customers[ci].id),
      distance: ev.dist,
      co2: ev.dist * vehicle.emissionPerKm,
      cost: ev.dist * vehicle.costPerKm,
      loadUsed: ev.load,
      timeUsed: ev.time,
      feasible: ev.violations === 0,
      violations: ev.violations,
    };
  }

  /** Đánh giá một chuỗi route — trả về metrics và số violations */
  private evalRouteSeq(
    route: number[],
    vehicle: VehicleConfig
  ): { dist: number; time: number; load: number; violations: number } {
    let violations = 0, dist = 0, t = 0, ld = 0;
    let cur = 0; // depot

    for (const ci of route) {
      const c = this.customers[ci];
      const d = this.distMatrix[cur][ci + 1];
      dist += d;
      t += travelTimeMin(d);
      if (t > c.twEnd) violations++;
      t = Math.max(t, c.twStart) + c.serviceMin;
      ld += c.demandKg;
      cur = ci + 1;
    }

    if (route.length > 0) {
      const returnDist = this.distMatrix[cur][0];
      dist += returnDist;
      t += travelTimeMin(returnDist);
    }

    if (t > vehicle.maxWorkMin) violations++;
    if (ld > vehicle.capacityKg) violations++;

    return { dist, time: t, load: ld, violations };
  }

  /** 2-opt local search với iteration limit từ config */
  private twoOptSearch(route: number[], vehicle: VehicleConfig): number[] {
    if (route.length < 3) return route;

    let best = [...route];
    let bestEval = this.evalRouteSeq(best, vehicle);
    let improved = true;
    let iter = 0;

    while (improved && iter < TWO_OPT_MAX_ITER) {
      improved = false;
      for (let i = 0; i < best.length - 1; i++) {
        for (let k = i + 1; k < best.length; k++) {
          const candidate = [
            ...best.slice(0, i),
            ...best.slice(i, k + 1).reverse(),
            ...best.slice(k + 1),
          ];
          const candEval = this.evalRouteSeq(candidate, vehicle);
          if (
            candEval.violations <= bestEval.violations &&
            candEval.dist < bestEval.dist
          ) {
            best = candidate;
            bestEval = candEval;
            improved = true;
          }
        }
      }
      iter++;
    }
    return best;
  }

  // ── Fitness Evaluation ──────────────────────────────────────────────────────

  private evaluate(chromosome: number[]): {
    solution: SolutionResult;
    fitness: number;
  } {
    const assignment = this.decode(chromosome);
    const routes: RouteResult[] = [];
    let totalDist = 0, totalCo2 = 0, totalCost = 0, totalViolations = 0;

    for (let k = 0; k < this.K; k++) {
      const r = this.buildRoute(this.vehicles[k], assignment.get(k) ?? []);
      routes.push(r);
      totalDist += r.distance;
      totalCo2 += r.co2;
      totalCost += r.cost;
      totalViolations += r.violations;
    }

    const penalty = totalViolations * PENALTY_FACTOR;
    const fitness =
      this.opts.w_dist * totalDist +
      this.opts.w_co2 * totalCo2 +
      this.opts.w_cost * totalCost +
      penalty;

    return {
      solution: {
        routes,
        totalDistance: totalDist,
        totalCo2,
        totalCost,
        totalViolations,
        feasible: totalViolations === 0,
      },
      fitness,
    };
  }

  // ── Genetic Operators ───────────────────────────────────────────────────────

  /** Uniform crossover */
  private crossover(a: number[], b: number[]): number[] {
    if (Math.random() > this.opts.crossoverRate) return [...a];
    return a.map((gene, i) => (Math.random() < 0.5 ? gene : b[i]));
  }

  /** Mutation: random reassign hoặc swap */
  private mutate(chromosome: number[]): number[] {
    const result = [...chromosome];
    for (let i = 0; i < result.length; i++) {
      if (Math.random() < this.opts.mutationRate) {
        if (Math.random() < 0.5) {
          result[i] = Math.floor(Math.random() * this.K);
        } else {
          const j = Math.floor(Math.random() * result.length);
          [result[i], result[j]] = [result[j], result[i]];
        }
      }
    }
    return this.repair(result);
  }

  /** Tournament selection (size từ constant) */
  private tournament(
    evaluated: Array<{ chromosome: number[]; fitness: number }>
  ): number[] {
    let best = evaluated[Math.floor(Math.random() * evaluated.length)];
    for (let i = 1; i < TOURNAMENT_SIZE; i++) {
      const c = evaluated[Math.floor(Math.random() * evaluated.length)];
      if (c.fitness < best.fitness) best = c;
    }
    return best.chromosome;
  }

  // ── Pareto Front Management ─────────────────────────────────────────────────

  private dominates(a: SolutionResult, b: SolutionResult): boolean {
    return (
      a.totalDistance <= b.totalDistance &&
      a.totalCo2 <= b.totalCo2 &&
      a.totalCost <= b.totalCost &&
      (a.totalDistance < b.totalDistance ||
        a.totalCo2 < b.totalCo2 ||
        a.totalCost < b.totalCost)
    );
  }

  private updatePareto(
    solution: SolutionResult,
    chromosome: number[],
    gen: number
  ): void {
    const newPoint: ParetoPoint = { ...solution, chromosome, generation: gen };
    const filtered = this._paretoFront.filter(
      (p) => !this.dominates(newPoint, p)
    );
    if (!filtered.some((p) => this.dominates(p, newPoint))) {
      filtered.push(newPoint);
      this._paretoFront = filtered;
    } else if (filtered.length < this._paretoFront.length) {
      this._paretoFront = filtered;
    }
  }

  // ── Main Loop ───────────────────────────────────────────────────────────────

  async run(
    onProgress?: (gen: number, total: number, info: ConvergenceEntry) => void
  ): Promise<ParetoPoint[]> {
    this._paretoFront = [];
    this._history = [];

    const { populationSize, generations } = this.opts;

    // Khởi tạo: 40% greedy + 60% random
    const greedyCount = Math.floor(populationSize * GREEDY_SEED_RATIO);
    this.population = [
      ...Array.from({ length: greedyCount }, () => this.greedyChromosome()),
      ...Array.from({ length: populationSize - greedyCount }, () =>
        this.randomChromosome()
      ),
    ];

    for (let gen = 0; gen < generations; gen++) {
      const evaluated = this.population.map((c) => {
        const { solution, fitness } = this.evaluate(c);
        return { chromosome: c, solution, fitness };
      });

      // Cập nhật Pareto front
      for (const ev of evaluated) {
        this.updatePareto(ev.solution, ev.chromosome, gen);
      }

      const feasibleCount = evaluated.filter((e) => e.solution.feasible).length;
      const bestFitness = Math.min(...evaluated.map((e) => e.fitness));
      const entry: ConvergenceEntry = {
        gen,
        bestFitness,
        feasibleCount,
        paretoSize: this._paretoFront.length,
      };
      this._history.push(entry);
      onProgress?.(gen, generations, entry);

      // Sinh offspring
      const offspring: number[][] = [];
      while (offspring.length < populationSize) {
        const p1 = this.tournament(evaluated);
        const p2 = this.tournament(evaluated);
        offspring.push(this.mutate(this.crossover(p1, p2)));
      }
      this.population = offspring;

      // Nhường CPU mỗi 10 thế hệ
      if (gen % 10 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    return [...this._paretoFront];
  }
}
