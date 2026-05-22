/**
 * SmartRoute — Shared Constants
 * Single source of truth cho toàn bộ magic numbers trong hệ thống.
 */

// ── Geo ───────────────────────────────────────────────────────────────────────
/** Bán kính Trái Đất (km) dùng cho Haversine */
export const EARTH_RADIUS_KM = 6_371;

/** Tọa độ depot mặc định (Bến xe Miền Đông, TP.HCM) */
export const DEFAULT_DEPOT = { lat: 10.7769, lng: 106.7009 } as const;

// ── Routing ───────────────────────────────────────────────────────────────────
/** Tốc độ xe trung bình trong đô thị (km/h) */
export const VEHICLE_SPEED_KMH = 40;

/** Giờ bắt đầu ca giao hàng tính bằng phút từ 00:00 (mặc định 06:00) */
export const DEFAULT_START_TIME_MIN = 360;

/** Giờ đóng cửa mặc định cho time window (phút) = 20:00 */
export const DEFAULT_TW_END_MIN = 1_200;

// ── NSGA-II Engine ────────────────────────────────────────────────────────────
/** Hệ số phạt mỗi constraint violation */
export const PENALTY_FACTOR = 80_000;

/** Số cá thể khởi tạo theo greedy (40% population) */
export const GREEDY_SEED_RATIO = 0.4;

/** Kích thước tournament selection */
export const TOURNAMENT_SIZE = 3;

/** Số iteration tối đa cho 2-opt local search */
export const TWO_OPT_MAX_ITER = 10;

/** Số Pareto points tối đa lưu vào DB */
export const MAX_PARETO_STORED = 30;

// ── NSGA-II Defaults ──────────────────────────────────────────────────────────
export const ENGINE_DEFAULTS = {
  populationSize: 80,
  generations: 150,
  crossoverRate: 0.85,
  mutationRate: 0.12,
  w_dist: 0.4,
  w_co2: 0.3,
  w_cost: 0.3,
} as const;

// ── API ───────────────────────────────────────────────────────────────────────
/** Số bản ghi tối đa trả về mỗi GET request */
export const DEFAULT_PAGE_LIMIT = 200;

/** Rate limit Nominatim: 1 req/s tối thiểu */
export const NOMINATIM_DELAY_MS = 1_100;

/** User-Agent gửi kèm Nominatim request */
export const NOMINATIM_USER_AGENT = "SmartRoute-ERP/1.0 (smartroute@company.vn)";
