/**
 * SmartRoute — Weighted Scalarization Engine
 *
 * Thuật toán tối ưu đơn mục tiêu: biến 3 objectives thành 1 fitness duy nhất
 * bằng tổng có trọng số (weighted sum scalarization).
 *
 * So sánh với NSGA-II:
 *   - NSGA-II: trả về Pareto front (nhiều nghiệm đánh đổi nhau)
 *   - Weighted: trả về 1 nghiệm tốt nhất theo trọng số đã chọn
 *   - Weighted chạy nhanh hơn (~30%) vì không cần quản lý Pareto front
 *   - Weighted phù hợp khi ưu tiên rõ ràng (e.g., chỉ quan tâm chi phí)
 */

import {
  PENALTY_FACTOR,
  GREEDY_SEED_RATIO,
  TOURNAMENT_SIZE,
  TWO_OPT_MAX_ITER,
  ENGINE_DEFAULTS,
} from "@/lib/constants";
import { buildDistMatrix, travelTimeMin } from "@/lib/haversine";
import {
  CustomerNode,
  VehicleConfig,
  DepotConfig,
  RouteResult,
  SolutionResult,
  EngineOptions,
  ConvergenceEntry,
} from "./engine";

export interface WeightedResult {
  solution: SolutionResult;
  fitness: number;
  generation: number;
  history: ConvergenceEntry[];
}

export class WeightedEngine {
  private readonly customers: CustomerNode[];
  private readonly vehicles: VehicleConfig[];
  private readonly distMatrix: number[][];
  private readonly N: number;
  private readonly K: number;
  private readonly opts: Required<EngineOptions>;

  private _history: ConvergenceEntry[] = [];

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
    this.distMatrix = buildDistMatrix(depot, customers);
  }

  get history(): Readonly<ConvergenceEntry[]> {
    return this._history;
  }

  // ── Chromosome Helpers (shared logic) ────────────────────────────────────────

  private randomChromosome(): number[] {
    const base = Array.from({ length: this.N }, (_, i) => i % this.K);
    for (let i = base.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [base[i], base[j]] = [base[j], base[i]];
    }
    return base;
  }

  private greedyChromosome(): number[] {
    const sorted = [...this.customers]
      .map((c, i) => ({ i, twEnd: c.twEnd, demand: c.demandKg }))
      .sort((a, b) => a.twEnd - b.twEnd);

    const chromosome = new Array<number>(this.N).fill(0);
    const vehicleLoad = new Array<number>(this.K).fill(0);

    for (const { i, demand } of sorted) {
      let bestK = -1, minLoad = Infinity;
      for (let k = 0; k < this.K; k++) {
        if (vehicleLoad[k] + demand <= this.vehicles[k].capacityKg &&
            vehicleLoad[k] < minLoad) {
          minLoad = vehicleLoad[k];
          bestK = k;
        }
      }
      if (bestK === -1) bestK = vehicleLoad.indexOf(Math.min(...vehicleLoad));
      chromosome[i] = bestK;
      vehicleLoad[bestK] += demand;
    }
    return chromosome;
  }

  private decode(chromosome: number[]): Map<number, number[]> {
    const map = new Map<number, number[]>();
    for (let k = 0; k < this.K; k++) map.set(k, []);
    for (let i = 0; i < this.N; i++) map.get(chromosome[i])!.push(i);
    return map;
  }

  private repair(chromosome: number[]): number[] {
    const result = [...chromosome];
    const assignment = this.decode(result);
    const empty = Array.from(assignment.entries())
      .filter(([, v]) => v.length === 0).map(([k]) => k);
    const full = Array.from(assignment.entries())
      .filter(([, v]) => v.length > 1)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([, v]) => v);
    for (let i = 0; i < empty.length && i < full.length; i++) {
      const ci = full[i][Math.floor(full[i].length / 2)];
      result[ci] = empty[i];
    }
    return result;
  }

  private evalRouteSeq(
    route: number[],
    vehicle: VehicleConfig
  ): { dist: number; time: number; load: number; violations: number } {
    let violations = 0, dist = 0, t = 0, ld = 0, cur = 0;
    for (const ci of route) {
      const c = this.customers[ci];
      const d = this.distMatrix[cur][ci + 1];
      dist += d; t += travelTimeMin(d);
      if (t > c.twEnd) violations++;
      t = Math.max(t, c.twStart) + c.serviceMin;
      ld += c.demandKg;
      cur = ci + 1;
    }
    if (route.length > 0) {
      const ret = this.distMatrix[cur][0];
      dist += ret; t += travelTimeMin(ret);
    }
    if (t > vehicle.maxWorkMin) violations++;
    if (ld > vehicle.capacityKg) violations++;
    return { dist, time: t, load: ld, violations };
  }

  private twoOptSearch(route: number[], vehicle: VehicleConfig): number[] {
    if (route.length < 3) return route;
    let best = [...route];
    let bestEval = this.evalRouteSeq(best, vehicle);
    let improved = true, iter = 0;
    while (improved && iter < TWO_OPT_MAX_ITER) {
      improved = false;
      for (let i = 0; i < best.length - 1; i++) {
        for (let k = i + 1; k < best.length; k++) {
          const cand = [...best.slice(0,i), ...best.slice(i,k+1).reverse(), ...best.slice(k+1)];
          const ev = this.evalRouteSeq(cand, vehicle);
          if (ev.violations <= bestEval.violations && ev.dist < bestEval.dist) {
            best = cand; bestEval = ev; improved = true;
          }
        }
      }
      iter++;
    }
    return best;
  }

  private buildRoute(vehicle: VehicleConfig, indices: number[]): RouteResult {
    if (indices.length === 0) {
      return {
        vehicleId: vehicle.id, customerSequence: [],
        distance: 0, co2: 0, cost: 0,
        loadUsed: 0, timeUsed: 0, feasible: true, violations: 0,
      };
    }
    const unvisited = new Set(indices);
    const route: number[] = [];
    let cur = 0, t = 0;
    while (unvisited.size > 0) {
      type C = { ci: number; dist: number; arrival: number; c: CustomerNode };
      const feasible: C[] = [], infeasible: C[] = [];
      for (const ci of unvisited) {
        const c = this.customers[ci];
        const dist = this.distMatrix[cur][ci + 1];
        const arrival = t + travelTimeMin(dist);
        (arrival <= c.twEnd ? feasible : infeasible).push({ ci, dist, arrival, c });
      }
      const pool = feasible.length > 0 ? feasible : infeasible;
      let best = pool[0], bestScore = Infinity;
      for (const p of pool) {
        const score = p.arrival <= p.c.twEnd
          ? travelTimeMin(p.dist) * 0.6 + (p.c.twEnd - Math.max(p.arrival, p.c.twStart)) * 0.4
          : 1e9 + (p.arrival - p.c.twEnd);
        if (score < bestScore) { bestScore = score; best = p; }
      }
      t = Math.max(best.arrival, best.c.twStart) + best.c.serviceMin;
      route.push(best.ci);
      unvisited.delete(best.ci);
      cur = best.ci + 1;
    }
    const opt = this.twoOptSearch(route, vehicle);
    const ev = this.evalRouteSeq(opt, vehicle);
    return {
      vehicleId: vehicle.id,
      customerSequence: opt.map(ci => this.customers[ci].id),
      distance: ev.dist,
      co2: ev.dist * vehicle.emissionPerKm,
      cost: ev.dist * vehicle.costPerKm,
      loadUsed: ev.load,
      timeUsed: ev.time,
      feasible: ev.violations === 0,
      violations: ev.violations,
    };
  }

  private evaluate(chromosome: number[]): { solution: SolutionResult; fitness: number } {
    const assignment = this.decode(chromosome);
    const routes: RouteResult[] = [];
    let totalDist = 0, totalCo2 = 0, totalCost = 0, totalViolations = 0;
    for (let k = 0; k < this.K; k++) {
      const r = this.buildRoute(this.vehicles[k], assignment.get(k) ?? []);
      routes.push(r);
      totalDist += r.distance; totalCo2 += r.co2;
      totalCost += r.cost; totalViolations += r.violations;
    }
    const fitness = this.opts.w_dist * totalDist
      + this.opts.w_co2  * totalCo2
      + this.opts.w_cost * totalCost
      + totalViolations  * PENALTY_FACTOR;
    return {
      solution: { routes, totalDistance: totalDist, totalCo2, totalCost, totalViolations, feasible: totalViolations === 0 },
      fitness,
    };
  }

  private crossover(a: number[], b: number[]): number[] {
    if (Math.random() > this.opts.crossoverRate) return [...a];
    return a.map((g, i) => Math.random() < 0.5 ? g : b[i]);
  }

  private mutate(chromosome: number[]): number[] {
    const result = [...chromosome];
    for (let i = 0; i < result.length; i++) {
      if (Math.random() < this.opts.mutationRate) {
        if (Math.random() < 0.5) result[i] = Math.floor(Math.random() * this.K);
        else { const j = Math.floor(Math.random() * result.length); [result[i], result[j]] = [result[j], result[i]]; }
      }
    }
    return this.repair(result);
  }

  private tournament(evaluated: Array<{ chromosome: number[]; fitness: number }>): number[] {
    let best = evaluated[Math.floor(Math.random() * evaluated.length)];
    for (let i = 1; i < TOURNAMENT_SIZE; i++) {
      const c = evaluated[Math.floor(Math.random() * evaluated.length)];
      if (c.fitness < best.fitness) best = c;
    }
    return best.chromosome;
  }

  // ── Main Loop ───────────────────────────────────────────────────────────────

  async run(
    onProgress?: (gen: number, total: number, info: ConvergenceEntry) => void
  ): Promise<WeightedResult> {
    this._history = [];
    const { populationSize, generations } = this.opts;
    const greedyCount = Math.floor(populationSize * GREEDY_SEED_RATIO);

    let population = [
      ...Array.from({ length: greedyCount }, () => this.greedyChromosome()),
      ...Array.from({ length: populationSize - greedyCount }, () => this.randomChromosome()),
    ];

    let globalBest: { chromosome: number[]; solution: SolutionResult; fitness: number } | null = null;

    for (let gen = 0; gen < generations; gen++) {
      const evaluated = population.map(c => {
        const { solution, fitness } = this.evaluate(c);
        return { chromosome: c, solution, fitness };
      });

      // Track global best
      const genBest = evaluated.reduce((a, b) => a.fitness < b.fitness ? a : b);
      if (!globalBest || genBest.fitness < globalBest.fitness) {
        globalBest = genBest;
      }

      const feasibleCount = evaluated.filter(e => e.solution.feasible).length;
      const entry: ConvergenceEntry = {
        gen,
        bestFitness: genBest.fitness,
        feasibleCount,
        paretoSize: 1, // Weighted luôn cho 1 nghiệm
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
      population = offspring;

      if (gen % 10 === 0) await new Promise(r => setTimeout(r, 0));
    }

    return {
      solution: globalBest!.solution,
      fitness: globalBest!.fitness,
      generation: generations - 1,
      history: [...this._history],
    };
  }
}
