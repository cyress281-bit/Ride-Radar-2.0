import { Link } from 'react-router-dom';

export default function AdminMetricCard({ to, label, value, icon: Icon }) {
  const content = (
    <div className="rounded-2xl border border-border/60 bg-card p-5 transition hover:border-primary/40">
      <Icon className="mb-3 h-5 w-5 text-primary" />
      <div className="font-display text-2xl font-bold">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}