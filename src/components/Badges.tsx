import type { NewsItem, NewsPriority, NewsStatus } from '../api/types';
import { label } from '../lib/format';

const base = 'inline-flex rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset';

const priorityStyle: Record<NewsPriority, string> = {
  LOW: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
  MEDIUM: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  HIGH: 'bg-orange-500/15 text-orange-300 ring-orange-500/30',
  CRITICAL: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
};

const statusStyle: Record<NewsStatus, string> = {
  RUMOR: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  CONFIRMED: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  DEBUNKED: 'bg-slate-500/20 text-slate-300 ring-slate-500/30 line-through',
};

export function NewsBadges({ item }: { item: Pick<NewsItem, 'priority' | 'status'> }) {
  return (
    <>
      <span className={`${base} ${priorityStyle[item.priority]}`}>Prioridad {label(item.priority).toLowerCase()}</span>
      <span className={`${base} ${statusStyle[item.status]}`} data-status={item.status}>{label(item.status)}</span>
    </>
  );
}
