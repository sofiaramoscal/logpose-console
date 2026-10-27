import { api } from './client';
import type {
  Crew, DashboardSummary, FruitFilter, LogPose, LoginRequest, LoginResponse, MeResponse, NewsDetail,
  NewsFeed, NewsPriority, NewsStatus, NewsType, PageSize, RegisterRequest, SagaStory, SagaSummary,
  VerifyStatus, WantedDetail, WantedPage, WantedSort, WantedStatus,
} from './types';

// Una función por endpoint. Las lecturas reciben un AbortSignal para poder cancelarlas.

/** Quita los parámetros vacíos para no mandarlos en la URL. */
function compact(params: Record<string, string | number | null>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) if (v !== '' && v !== null) out[k] = v;
  return out;
}

// ----- Auth -----
export const register = (body: RegisterRequest) =>
  api.post<LoginResponse>('/auth/register', body).then(r => r.data);

export const login = (body: LoginRequest) =>
  api.post<LoginResponse>('/auth/login', body).then(r => r.data);

export const getMe = (signal?: AbortSignal) =>
  api.get<MeResponse>('/auth/me', { signal }).then(r => r.data);

// ----- East Blue -----
export const getDashboard = (signal?: AbortSignal) =>
  api.get<DashboardSummary>('/dashboard/summary', { signal }).then(r => r.data);

export const getLogPose = (signal?: AbortSignal) =>
  api.get<LogPose>('/log-pose', { signal }).then(r => r.data);

export const getCrews = (signal?: AbortSignal) =>
  api.get<Crew[]>('/crews', { signal }).then(r => r.data);

export interface WantedQuery {
  page: number;
  size: PageSize;
  sort: WantedSort;
  status: WantedStatus | '';
  crewId: string;
  fruit: FruitFilter | '';
  q: string;
}

export const getWanted = (query: WantedQuery, signal?: AbortSignal) =>
  api.get<WantedPage>('/wanted', { params: compact({ ...query }), signal }).then(r => r.data);

export const getWantedDetail = (id: string, signal?: AbortSignal) =>
  api.get<WantedDetail>(`/wanted/${encodeURIComponent(id)}`, { signal }).then(r => r.data);

// ----- Grand Line (requieren Log Pose: si no, 423) -----
export interface NewsFilters {
  type: NewsType | '';
  priority: NewsPriority | '';
  status: NewsStatus | '';
}

export const getNewsFeed = (filters: NewsFilters, cursor: string | null, limit: number, signal?: AbortSignal) =>
  api.get<NewsFeed>('/news/feed', { params: compact({ ...filters, cursor, limit }), signal }).then(r => r.data);

export const getNews = (id: string, signal?: AbortSignal) =>
  api.get<NewsDetail>(`/news/${encodeURIComponent(id)}`, { signal }).then(r => r.data);

export const verifyNews = (id: string, status: VerifyStatus) =>
  api.patch<NewsDetail>(`/news/${encodeURIComponent(id)}/status`, { status }).then(r => r.data);

export const getSagas = (signal?: AbortSignal) =>
  api.get<SagaSummary[]>('/sagas', { signal }).then(r => r.data);

export const getSagaStory = (id: string, signal?: AbortSignal) =>
  api.get<SagaStory>(`/sagas/${encodeURIComponent(id)}/story`, { signal }).then(r => r.data);
