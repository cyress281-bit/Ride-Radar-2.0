import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CalendarPlus, MapPin, Clock } from 'lucide-react';
import { useAdminData } from '@/features/admin/hooks/use-admin-data.js';
import AdminPageShell from '@/features/admin/components/AdminPageShell.jsx';
import AdminLayout from '@/features/admin/components/AdminLayout.jsx';
import CreateEventDialog from '@/features/admin/components/CreateEventDialog.jsx';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function formatEventDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function EventRow({ event }) {
  const isPast = event.event_date ? new Date(event.event_date) < new Date() : false;

  return (
    <div className="rounded-[20px] border border-border bg-surface p-4 transition hover:bg-surface-elevated">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span
          className={
            event.status === 'active'
              ? 'text-[10px] font-bold uppercase tracking-widest text-primary'
              : 'text-[10px] font-bold uppercase tracking-widest text-muted-foreground'
          }
        >
          {event.status}
        </span>
        {isPast && (
          <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Past
          </span>
        )}
      </div>

      <div className="mb-1 text-sm font-semibold leading-snug">{event.title || '(untitled)'}</div>

      {event.location_name && (
        <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          {event.location_name}
        </div>
      )}

      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3 shrink-0" />
        {formatEventDate(event.event_date)}
        {event.expires_at && (
          <span className="text-muted-foreground/60">
            {' '}→ {formatEventDate(event.expires_at)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AdminEventsPage() {
  return (
    <AdminPageShell
      skeleton={
        <AdminLayout>
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-[20px]" />
            ))}
          </div>
        </AdminLayout>
      }
    >
      <AdminEventsContent />
    </AdminPageShell>
  );
}

function AdminEventsContent() {
  const qc = useQueryClient();
  const { broadcasts, isLoading } = useAdminData();
  const [createOpen, setCreateOpen] = useState(false);

  const { upcoming, past } = useMemo(() => {
    const all = (broadcasts.data?.data || []).filter((b) => b.type === 'event');
    const now = new Date();
    const up = all
      .filter((b) => !b.event_date || new Date(b.event_date) >= now)
      .sort((a, b) => new Date(a.event_date || 0) - new Date(b.event_date || 0));
    const pa = all
      .filter((b) => b.event_date && new Date(b.event_date) < now)
      .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
    return { upcoming: up, past: pa };
  }, [broadcasts.data]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-[20px]" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Events</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <CalendarPlus className="h-4 w-4" />
          Create Event
        </Button>
      </div>

      {upcoming.length === 0 && past.length === 0 && (
        <div className="rounded-[20px] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <CalendarDays className="mx-auto mb-2 h-6 w-6 text-primary" />
          No event broadcasts yet.
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Upcoming ({upcoming.length})
          </p>
          <div className="space-y-2">
            {upcoming.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Past ({past.length})
          </p>
          <div className="space-y-2">
            {past.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}

      <CreateEventDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
        }}
      />
    </AdminLayout>
  );
}
