/**
 * SmartRoute — NSGA-II Engine (TypeScript)
 * Port từ MOVRP project với real-world lat/lng support
 */

export interface CustomerNode {
  id: string;
  lat: number;
  lng: number;
  demandKg: number;
  twStart: number;  // phút từ 00:00
  twEnd: number;
  serviceMin: number;
}

export interface VehicleConfig {
  id: string;
  capacityKg: number;
  costPerKm: number;
  emissionPerKm: number;
  maxWorkMin: number;
}

export interface RouteResult {
  vehicleId: string;
  customerSequence: string[];  // customer IDs in visit order
  distance: number;   // km
  co2: number;
  cost: number;
  loadUsed: number;
  timeUsed: number;
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

// Haversine distance (km) giữa 2 tọa độ thực
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Tốc độ xe mặc định: 40 km/h trong đô thị
const VEHICLE_SPEED_KMH = 40;

function travelTimeMin(dist: number): number {
  return (dist / VEHICLE_SPEED_KMH) * 60;
}

export class NSGAEngine {
  private customers: CustomerNode[];
  private vehicles: VehicleConfig[];
  private distMatrix: number[][];  // km
  private N: number;
  private K: number;
  private penaltyFactor: number;
  private population: number[][];
  private opts: {
    populationSize: number;
    generations: number;
    crossoverRate: number;
    mutationRate: number;
    mode: 'nsga2' | 'weighted';
    w_dist: number; w_co2: number; w_cost: number;
  };
  paretoFront: ParetoPoint[] = [];
  history: Array<{ gen: number; bestFitness: number; feasibleCount: number; paretoSize: number }> = [];

  constructor(
    customers: CustomerNode[],
    vehicles: VehicleConfig[],
    options: Partial<typeof NSGAEngine.prototype.opts> = {}
  ) {
    this.customers = customers;
    this.vehicles = vehicles;
    this.N = customers.length;
    this.K = vehicles.length;
    this.penaltyFactor = 80000;
    this.opts = {
      populationSize: options.populationSize ?? 80,
      generations: options.generations ?? 150,
      crossoverRate: options.crossoverRate ?? 0.85,
      mutationRate: options.mutationRate ?? 0.12,
      mode: options.mode ?? 'nsga2',
      w_dist: options.w_dist ?? 0.4,
      w_co2: options.w_co2 ?? 0.3,
      w_cost: options.w_cost ?? 0.3,
    };
    this.population = [];
    this._buildDistMatrix();
  }

  private _buildDistMatrix() {
    const nodes = [
      { lat: 0, lng: 0 },  // depot placeholder — sẽ được set qua setDepot
      ...this.customers
    ];
    // Không dùng depot thật ở đây vì depot được pass riêng
    this.distMatrix = Array.from({ length: this.N + 1 }, (_, i) =>
      Array.from({ length: this.N + 1 }, (_, j) => {
        if (i === j) return 0;
        const ni = i === 0 ? { lat: 0, lng: 0 } : this.customers[i - 1];
        const nj = j === 0 ? { lat: 0, lng: 0 } : this.customers[j - 1];
        return haversine(ni.lat, ni.lng, nj.lat, nj.lng);
      })
    );
  }

  setDepot(lat: number, lng: number) {
    // Cập nhật hàng/cột 0 của distMatrix với depot thực
    for (let j = 1; j <= this.N; j++) {
      const c = this.customers[j - 1];
      const d = haversine(lat, lng, c.lat, c.lng);
      this.distMatrix[0][j] = d;
      this.distMatrix[j][0] = d;
    }
  }

  // ─── Chromosome ─────────────────────────────────────────────────────────────

  private _randomChromosome(): number[] {
    const base = Array.from({ length: this.N }, (_, i) => i % this.K);
    for (let i = base.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [base[i], base[j]] = [base[j], base[i]];
    }
    return base;
  }

  private _greedyChromosome(): number[] {
    const sorted = [...this.customers]
      .map((c, i) => ({ i, twEnd: c.twEnd, demand: c.demandKg }))
      .sort((a, b) => a.twEnd - b.twEnd);
    const chromosome = new Array(this.N).fill(0);
    const vehicleLoad = new Array(this.K).fill(0);
    for (const { i, demand } of sorted) {
      const cap = this.vehicles[0].capacityKg;
      let bestK = -1, minLoad = Infinity;
      for (let k = 0; k < this.K; k++) {
        if (vehicleLoad[k] + demand <= cap && vehicleLoad[k] < minLoad) {
          minLoad = vehicleLoad[k]; bestK = k;
        }
      }
      if (bestK === -1) bestK = vehicleLoad.indexOf(Math.min(...vehicleLoad));
      chromosome[i] = bestK;
      vehicleLoad[bestK] += demand;
    }
    return chromosome;
  }

  private _decode(chromosome: number[]): Map<number, number[]> {
    const assignment = new Map<number, number[]>();
    for (let k = 0; k < this.K; k++) assignment.set(k, []);
    for (let i = 0; i < this.N; i++) {
      assignment.get(chromosome[i])!.push(i);
    }
    return assignment;
  }

  private _repair(chromosome: number[]): number[] {
    const result = [...chromosome];
    const assignment = this._decode(result);
    const empty = Array.from(assignment.entries()).filter(([, v]) => v.length === 0).map(([k]) => k);
    const full  = Array.from(assignment.entries()).filter(([, v]) => v.length > 1).map(([k, v]) => ({ k, v }));
    for (let i = 0; i < empty.length && i < full.length; i++) {
      const from = full[i];
      const ci = from.v[Math.floor(from.v.length / 2)];
      result[ci] = empty[i];
    }
    return result;
  }

  // ─── Route Builder (EDF-NN) ─────────────────────────────────────────────────

  private _buildRoute(vehicle: VehicleConfig, customerIndices: number[]): RouteResult {
    if (customerIndices.length === 0) {
      return {
        vehicleId: vehicle.id, customerSequence: [],
        distance: 0, co2: 0, cost: 0,
        loadUsed: 0, timeUsed: 0, feasible: true, violations: 0
      };
    }

    const unvisited = new Set(customerIndices);
    const route: number[] = [];
    let currentNode = 0; // depot
    let currentTime = 0; // phút
    let load = 0;

    while (unvisited.size > 0) {
      const feasible: Array<{ ci: number; dist: number; arrival: number; c: CustomerNode }> = [];
      const infeasible: typeof feasible = [];

      for (const ci of unvisited) {
        const c = this.customers[ci];
        const dist = this.distMatrix[currentNode][ci + 1];
        const tt = travelTimeMin(dist);
        const arrival = currentTime + tt;
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

      const { ci, arrival, c } = best;
      currentTime = Math.max(arrival, c.twStart) + c.serviceMin;
      load += c.demandKg;
      route.push(ci);
      unvisited.delete(ci);
      currentNode = ci + 1;
    }

    // Apply Memetic 2-opt Local Search
    const optRoute = this._twoOptSearch(route, vehicle);

    // Final evaluate route
    const ev = this._evalRouteSeq(optRoute, vehicle);

    return {
      vehicleId: vehicle.id,
      customerSequence: optRoute.map(ci => this.customers[ci].id),
      distance: ev.dist,
      co2: ev.dist * vehicle.emissionPerKm,
      cost: ev.dist * vehicle.costPerKm,
      loadUsed: ev.load,
      timeUsed: ev.time,
      feasible: ev.violations === 0,
      violations: ev.violations,
    };
  }

  private _evalRouteSeq(route: number[], vehicle: VehicleConfig): { dist: number, time: number, load: number, violations: number } {
    let violations = 0, dist = 0, t = 0, ld = 0;
    let cur = 0;
    for (const ci of route) {
      const c = this.customers[ci];
      const d = this.distMatrix[cur][ci + 1];
      dist += d;
      t += travelTimeMin(d);
      const arrival = t;
      if (arrival > c.twEnd) violations++;
      t = Math.max(arrival, c.twStart) + c.serviceMin;
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

  private _twoOptSearch(route: number[], vehicle: VehicleConfig): number[] {
    if (route.length < 3) return route;
    let bestRoute = [...route];
    let bestEval = this._evalRouteSeq(bestRoute, vehicle);
    let improved = true;
    let iterations = 0;
    while (improved && iterations < 10) { // Limit iterations
      improved = false;
      for (let i = 0; i < bestRoute.length - 1; i++) {
        for (let k = i + 1; k < bestRoute.length; k++) {
          const newRoute = [
            ...bestRoute.slice(0, i),
            ...bestRoute.slice(i, k + 1).reverse(),
            ...bestRoute.slice(k + 1)
          ];
          const newEval = this._evalRouteSeq(newRoute, vehicle);
          // Accept if distance is strictly better and violations do not increase
          if (newEval.violations <= bestEval.violations && newEval.dist < bestEval.dist) {
            bestRoute = newRoute;
            bestEval = newEval;
            improved = true;
          }
        }
      }
      iterations++;
    }
    return bestRoute;
  }

  // ─── Evaluate ───────────────────────────────────────────────────────────────

  private _evaluate(chromosome: number[]): { solution: SolutionResult; fitness: number } {
    const assignment = this._decode(chromosome);
    const routes: RouteResult[] = [];
    let totalDist = 0, totalCo2 = 0, totalCost = 0, totalViolations = 0;

    for (let k = 0; k < this.K; k++) {
      const r = this._buildRoute(this.vehicles[k], assignment.get(k) ?? []);
      routes.push(r);
      totalDist += r.distance;
      totalCo2 += r.co2;
      totalCost += r.cost;
      totalViolations += r.violations;
    }

    const penalty = totalViolations * this.penaltyFactor;
    const fitness = this.opts.w_dist * totalDist + this.opts.w_co2 * totalCo2 + this.opts.w_cost * totalCost + penalty;

    return {
      solution: {
        routes, totalDistance: totalDist, totalCo2, totalCost,
        totalViolations, feasible: totalViolations === 0
      },
      fitness,
    };
  }

  // ─── Genetic Operators ──────────────────────────────────────────────────────

  private _crossover(a: number[], b: number[]): number[] {
    if (Math.random() > this.opts.crossoverRate) return [...a];
    return a.map((gene, i) => Math.random() < 0.5 ? gene : b[i]);
  }

  private _mutate(chromosome: number[]): number[] {
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
    return this._repair(result);
  }

  private _tournament(evaluated: Array<{ chromosome: number[]; fitness: number }>): number[] {
    const size = 3;
    let best = evaluated[Math.floor(Math.random() * evaluated.length)];
    for (let i = 1; i < size; i++) {
      const c = evaluated[Math.floor(Math.random() * evaluated.length)];
      if (c.fitness < best.fitness) best = c;
    }
    return best.chromosome;
  }

  // ─── Pareto ─────────────────────────────────────────────────────────────────

  private _dominates(a: SolutionResult, b: SolutionResult): boolean {
    const ad = a.totalDistance, ac = a.totalCo2, ax = a.totalCost;
    const bd = b.totalDistance, bc = b.totalCo2, bx = b.totalCost;
    return ad <= bd && ac <= bc && ax <= bx && (ad < bd || ac < bc || ax < bx);
  }

  private _updatePareto(solution: SolutionResult, chromosome: number[], gen: number) {
    const newPoint: ParetoPoint = { ...solution, chromosome, generation: gen };
    const filtered = this.paretoFront.filter(p => !this._dominates(newPoint, p));
    if (!filtered.some(p => this._dominates(p, newPoint))) {
      filtered.push(newPoint);
      this.paretoFront = filtered;
    } else if (filtered.length < this.paretoFront.length) {
      this.paretoFront = filtered;
    }
  }

  // ─── Main Run ───────────────────────────────────────────────────────────────

  async run(
    onProgress?: (gen: number, total: number, info: typeof this.history[0]) => void
  ): Promise<ParetoPoint[]> {
    this.paretoFront = [];
    this.history = [];

    // Init population
    this.population = Array.from({ length: this.opts.populationSize }, (_, i) =>
      i < this.opts.populationSize * 0.4 ? this._greedyChromosome() : this._randomChromosome()
    );

    for (let gen = 0; gen < this.opts.generations; gen++) {
      const evaluated = this.population.map(c => {
        const { solution, fitness } = this._evaluate(c);
        return { chromosome: c, solution, fitness };
      });

      // Update Pareto
      for (const ev of evaluated) {
        this._updatePareto(ev.solution, ev.chromosome, gen);
      }

      const feasibleCount = evaluated.filter(e => e.solution.feasible).length;
      const bestFitness = Math.min(...evaluated.map(e => e.fitness));
      const info = { gen, bestFitness, feasibleCount, paretoSize: this.paretoFront.length };
      this.history.push(info);

      onProgress?.(gen, this.opts.generations, info);

      // Create offspring
      const offspring: number[][] = [];
      while (offspring.length < this.opts.populationSize) {
        const p1 = this._tournament(evaluated);
        const p2 = this._tournament(evaluated);
        offspring.push(this._mutate(this._crossover(p1, p2)));
      }
      this.population = offspring;

      // Yield control để không block
      if (gen % 10 === 0) await new Promise(r => setTimeout(r, 0));
    }

    return this.paretoFront;
  }
}
