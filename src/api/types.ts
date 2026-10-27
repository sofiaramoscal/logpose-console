// Tipos copiados del contrato (Swagger). Nunca usamos `any` para las respuestas de la API.

export const WANTED_STATUSES = ['AT_LARGE', 'CAPTURED', 'MISSING'] as const;
export const FRUIT_FILTERS = ['PARAMECIA', 'ZOAN', 'LOGIA', 'NONE'] as const;
export const WANTED_SORTS = ['bounty,desc', 'name,asc', 'updatedAt,desc'] as const;
export const PAGE_SIZES = [10, 20, 50] as const;
export const NEWS_TYPES = ['BOUNTY_UPDATE', 'BATTLE', 'MARINE_OPERATION', 'WORLD_GOVERNMENT', 'DISCOVERY'] as const;
export const NEWS_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const NEWS_STATUSES = ['RUMOR', 'CONFIRMED', 'DEBUNKED'] as const;

// `(typeof X)[number]` convierte la lista en una unión de strings: 'AT_LARGE' | 'CAPTURED' | 'MISSING'
export type WantedStatus = (typeof WANTED_STATUSES)[number];
export type FruitFilter = (typeof FRUIT_FILTERS)[number];
export type FruitType = Exclude<FruitFilter, 'NONE'>;
export type WantedSort = (typeof WANTED_SORTS)[number];
export type PageSize = (typeof PAGE_SIZES)[number];
export type NewsType = (typeof NEWS_TYPES)[number];
export type NewsPriority = (typeof NEWS_PRIORITIES)[number];
export type NewsStatus = (typeof NEWS_STATUSES)[number];
export type VerifyStatus = Exclude<NewsStatus, 'RUMOR'>;
export type LogPoseStatus = 'LOCKED' | 'UNLOCKED';

// ---------- Auth ----------
export interface User { id: string; name: string; email: string }
export interface Team { code: string; name: string }

export interface LoginRequest { email: string; password: string }
export interface RegisterRequest { teamName: string; email: string; password: string }

export interface LoginResponse {
  token: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: User;
  team: Team;
}

export interface MeResponse { user: User; team: Team; expiresAt: string }

// ---------- Dashboard y Log Pose ----------
export interface Crew {
  id: string;
  name: string;
  shipName: string;
  jollyRogerColor: string;
  memberCount: number;
  totalBounty: number;
}

export interface DashboardSummary {
  team: Team;
  wanted: {
    total: number;
    totalBounty: number;
    averageBounty: number;
    byStatus: Record<WantedStatus, number>;
    byFruit: Record<FruitFilter, number>;
  };
  crews: { total: number; mostWanted: Crew | null };
  topBounties: WantedSummary[];
  generatedAt: string;
}

export interface LogPose {
  status: LogPoseStatus;
  grandLineUnlocked: boolean;
  unlockedAt: string | null;
  message: string;
}

// ---------- Carteles ----------
export interface DevilFruit { name: string; type: FruitType }

export interface WantedSummary {
  id: string;
  name: string;
  epithet: string;
  bounty: number;
  status: WantedStatus;
  crew: { id: string; name: string };
  role: string;
  devilFruit: DevilFruit | null;
  threatLevel: number;
  lastSeenIsland: string;
  updatedAt: string;
}

export interface WantedDetail extends WantedSummary {
  age: number;
  heightCm: number;
  bio: string;
  lastSeen: { island: string; seenAt: string };
  bountyHistory: { amount: number; issuedAt: string }[];
}

export interface WantedPage {
  content: WantedSummary[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

// ---------- Noticias ----------
export interface NewsItem {
  id: string;
  type: NewsType;
  priority: NewsPriority;
  status: NewsStatus;
  title: string;
  summary: string;
  source: string;
  island: string;
  relatedWanted: { id: string; name: string } | null;
  publishedAt: string;
  updatedAt: string;
  verifiedAt: string | null;
}

export interface NewsDetail extends NewsItem { body: string[] }

export interface NewsFeed { items: NewsItem[]; nextCursor: string | null; hasMore: boolean }

// ---------- Sagas ----------
export interface Palette { background: string; surface: string; primary: string; accent: string; text: string }

export interface SagaSummary {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  synopsis: string;
  stageCount: number;
  totalDistanceNm: number;
  firstIsland: string;
  lastIsland: string;
  palette: Palette;
}

export interface StageMetric {
  key: 'distanceNm' | 'crewMorale' | 'bountyPool' | 'marineThreat';
  label: string;
  value: number;
  unit: string;
}

export interface SagaStage {
  id: string;
  order: number;
  slug: string;
  title: string;
  narrative: string[];
  island: { id: string; name: string; x: number; y: number };
  palette: Palette;
  metrics: StageMetric[];
}

export interface SagaStory {
  saga: SagaSummary & { intro: string };
  map: { width: number; height: number };
  stages: SagaStage[];
}

// ---------- Errores (formato único de la API) ----------
export interface ApiErrorBody {
  status: number;
  code: string;
  message: string;
  traceId?: string;
  details?: { field: string; message: string }[];
  retryAfterSeconds?: number;
  current?: NewsDetail;
}
