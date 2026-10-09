import type { LucideIcon } from 'lucide-react';

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

export function StatCard({ icon: Icon, label, value, tone = 'primary' }: { icon: LucideIcon; label: string; value: number | string; tone?: Tone }) {
  return (
    <div className="card stat-card">
      <div className={`stat-icon tone-${tone}`}><Icon size={24} /></div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h2>{title}</h2>
        {sub && <div className="crumb">{sub}</div>}
      </div>
      {children && <div className="actions">{children}</div>}
    </div>
  );
}

export function initials(name?: string | null) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

export function Avatar({ name }: { name?: string | null }) {
  return <div className="avatar">{initials(name)}</div>;
}
