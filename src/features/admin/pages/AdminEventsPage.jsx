import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CalendarPlus, ChevronDown, Clock, Pencil, ShieldCheck, MapPin } from 'lucide-react';
import { useAdminData } from '@/features/admin/hooks/use-admin-data.js';
import AdminPageShell from '@/features/admin/components/AdminPageShell.jsx';
import AdminLayout from '@/features/admin/components/AdminLayout.jsx';
import CreateEventDialog from '@/features/admin/components/CreateEventDialog.jsx';
import EditEventDialog from '@/features/admin/components/EditEventDialog.jsx';
import { getEventRsvpCounts, toggleOfficialEvent } from '@/features/admin/api/admin-api.js';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils.js';

function formatEventDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function DetailField({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="break-words text-sm text-foreground/90">{value}</div>
    </div>
  );
}

function EventRow({
  event,
  onEdit,
  isExpanded,
  onToggle,
  onToggleOfficial,
  officialActionLabel,
  officialActionDisabled = false,
  rsvpCount = 0,
  authorProfile,
}) {
  const isPast = event.event_date ? new Date(event.event_date) < new Date() : false;
  const authorLabel = authorProfile?.display_name || authorProfile?.username || event.author_id || 'Unknown';

  return (
    <div className="rounded-[20px] border border-border bg-surface p-4 transition hover:bg-surface-elevated">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
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
            {event.is_official && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                <ShieldCheck className="h-3 w-3" />
                Official
              </span>
            )}
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
              <span className="truncate">{event.location_name}</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            {formatEventDate(event.event_date)}
            {event.expires_at && (
              <span className="text-muted-foreground/60">
                {' '}to {formatEventDate(event.expires_at)}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
              {rsvpCount} RSVP{rsvpCount === 1 ? '' : 's'}
            </span>
            <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {authorProfile?.display_name || authorProfile?.username ? authorLabel : event.author_id}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onToggleOfficial?.(event)}
              disabled={officialActionDisabled}
              className="h-8 rounded-full px-3 text-xs"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {officialActionLabel}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onToggle?.(event.id)}
              className="h-8 rounded-full px-3 text-xs"
            >
              Details
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')} />
            </Button>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onEdit?.(event)}
          aria-label={`Edit ${event.title || 'event'}`}
          className="shrink-0 border border-white/[0.06] bg-white/[0.03] text-muted-foreground hover:border-primary/25 hover:bg-primary/10 hover:text-primary"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-4 rounded-[18px] border border-white/[0.06] bg-black/20 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <DetailField label="Title" value={event.title || '(untitled)'} />
            <DetailField label="Status" value={event.status || 'unknown'} />
            <DetailField label="Location" value={event.location_name || '—'} />
            <DetailField label="RSVPs" value={String(rsvpCount)} />
            <DetailField label="Start" value={formatEventDate(event.event_date)} />
            <DetailField label="End" value={formatEventDate(event.expires_at)} />
            <DetailField label="Author" value={authorLabel} />
            <DetailField label="Author ID" value={event.author_id || '—'} />
            <DetailField label="Created" value={formatEventDate(event.created_at)} />
          </div>

          {event.body && (
            <div className="mt-4">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Description
              </div>
              <div className="whitespace-pre-wrap rounded-[16px] border border-white/[0.06] bg-surface/70 p-3 text-sm text-foreground/90">
                {event.body}
              </div>
            </div>
          )}

          {event.event_image_url && (
            <div className="mt-4">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Event image
              </div>
              <a
                href={event.event_image_url}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-[18px] border border-white/[0.06] bg-black/30"
              >
                <img
                  src={event.event_image_url}
                  alt={event.title || 'Event image'}
                  className="h-52 w-full object-cover"
                />
              </a>
            </div>
          )}
        </div>
      )}
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
  const { broadcasts, profiles, isLoading } = useAdminData();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [expandedEventId, setExpandedEventId] = useState(null);

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

  const visibleEventIds = useMemo(
    () => [...upcoming, ...past].map((event) => event.id),
    [upcoming, past]
  );

  const { data: rsvpCountMap = {} } = useQuery({
    queryKey: ['admin', 'event-rsvp-counts', visibleEventIds.join(',')],
    queryFn: async () => {
      const { data, error } = await getEventRsvpCounts(visibleEventIds);
      if (error) throw error;
      return data || {};
    },
    enabled: visibleEventIds.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const toggleOfficial = useMutation({
    mutationFn: async ({ id, isOfficial }) => {
      const { data, error } = await toggleOfficialEvent(id, isOfficial);
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      toast({
        title: variables.isOfficial ? 'Event marked official' : 'Official flag removed',
        description: 'Admin events refreshed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Could not update official status',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const profileByUserId = useMemo(
    () => new Map((profiles.data?.data || []).map((p) => [p.user_id || p.id, p])),
    [profiles.data]
  );

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
              <EventRow
                key={e.id}
                event={e}
                rsvpCount={rsvpCountMap[e.id] ?? 0}
                authorProfile={profileByUserId.get(e.author_id)}
                isExpanded={expandedEventId === e.id}
                officialActionLabel={e.is_official ? 'Remove official' : 'Mark official'}
                officialActionDisabled={toggleOfficial.isPending}
                onEdit={(event) => {
                  setSelectedEvent(event);
                  setEditOpen(true);
                }}
                onToggle={(id) => setExpandedEventId((current) => (current === id ? null : id))}
                onToggleOfficial={(event) =>
                  toggleOfficial.mutate({ id: event.id, isOfficial: !event.is_official })
                }
              />
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
              <EventRow
                key={e.id}
                event={e}
                rsvpCount={rsvpCountMap[e.id] ?? 0}
                authorProfile={profileByUserId.get(e.author_id)}
                isExpanded={expandedEventId === e.id}
                officialActionLabel={e.is_official ? 'Remove official' : 'Mark official'}
                officialActionDisabled={toggleOfficial.isPending}
                onEdit={(event) => {
                  setSelectedEvent(event);
                  setEditOpen(true);
                }}
                onToggle={(id) => setExpandedEventId((current) => (current === id ? null : id))}
                onToggleOfficial={(event) =>
                  toggleOfficial.mutate({ id: event.id, isOfficial: !event.is_official })
                }
              />
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

      <EditEventDialog
        event={selectedEvent}
        open={editOpen}
        onOpenChange={(nextOpen) => {
          setEditOpen(nextOpen);
          if (!nextOpen) setSelectedEvent(null);
        }}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
        }}
      />
    </AdminLayout>
  );
}
