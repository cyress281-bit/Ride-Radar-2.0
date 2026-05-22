import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Activity, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase.js';
import { cn } from '@/lib/utils.js';
import AdminPageShell from '@/features/admin/components/AdminPageShell.jsx';
import AdminLayout from '@/features/admin/components/AdminLayout.jsx';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealtimeHealthSnapshot } from '@/lib/realtimeHealthRegistry.js';

/**
 * Admin Health Monitor — Real-time system health dashboard.
 */
const DEPLOYMENT_URL = 'https://www.rideradarapp.com';

function formatHealthTime(value) {
  if (!value) return 'never';
  const ms = Date.now() - Number(value);
  if (!Number.isFinite(ms) || ms < 0) return 'never';
  if (ms < 1000) return 'just now';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  return `${Math.round(ms / 3_600_000)}h ago`;
}

export default function AdminHealthPage() {
  return (
    <AdminPageShell
      skeleton={
        <AdminLayout>
          <div className="mb-4">
            <h2 className="font-display text-xl font-bold">System Health</h2>
            <p className="text-sm text-muted-foreground">Running checks...</p>
          </div>
          <Skeleton className="mb-4 h-32 w-full rounded-[20px]" />
          <div className="grid gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-[20px]" />
            ))}
          </div>
        </AdminLayout>
      }
    >
      <AdminHealthContent />
    </AdminPageShell>
  );
}

function AdminHealthContent() {
  const [checks, setChecks] = useState([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const realtimeHealth = useRealtimeHealthSnapshot();

  async function runHealthChecks() {
    setRunning(true);
    const results = [];

    // 1. Auth connectivity
    try {
      const start = performance.now();
      const { error } = await supabase.auth.getSession();
      const ms = Math.round(performance.now() - start);
      results.push({
        name: 'Supabase Auth',
        status: error ? 'fail' : 'pass',
        latency: `${ms}ms`,
        detail: error ? error.message : 'Connected',
      });
    } catch (err) {
      results.push({ name: 'Supabase Auth', status: 'fail', detail: err.message });
    }

    // 2. Database query
    try {
      const start = performance.now();
      const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
      const ms = Math.round(performance.now() - start);
      results.push({
        name: 'Database Query',
        status: error ? 'fail' : 'pass',
        latency: `${ms}ms`,
        detail: error ? error.message : `Users table accessible`,
      });
    } catch (err) {
      results.push({ name: 'Database Query', status: 'fail', detail: err.message });
    }

    // 3. RPC function
    try {
      const start = performance.now();
      const { error } = await supabase.rpc('get_nearby_broadcasts', {
        user_lat: 40.7128,
        user_lng: -74.006,
        radius_miles: 1,
        limit_count: 1,
      });
      const ms = Math.round(performance.now() - start);
      results.push({
        name: 'PostGIS RPC',
        status: error ? 'fail' : 'pass',
        latency: `${ms}ms`,
        detail: error ? error.message : 'RPC callable',
      });
    } catch (err) {
      results.push({ name: 'PostGIS RPC', status: 'fail', detail: err.message });
    }

    // 4. Realtime
    const channel = supabase.channel('health-check');
    try {
      const start = performance.now();
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
        channel.subscribe((status) => {
          clearTimeout(timeout);
          resolve(status);
        });
      });
      const ms = Math.round(performance.now() - start);
      results.push({
        name: 'Realtime Channel',
        status: 'pass',
        latency: `${ms}ms`,
        detail: 'Subscribed',
      });
    } catch (err) {
      results.push({ name: 'Realtime Channel', status: 'fail', detail: err.message });
    } finally {
      supabase.removeChannel(channel);
    }

    // 5. Storage
    try {
      const start = performance.now();
      const { error } = await supabase.storage.getBucket('avatars');
      const ms = Math.round(performance.now() - start);
      results.push({
        name: 'Storage',
        status: error && error.statusCode === 404 ? 'pass' : error ? 'fail' : 'pass',
        latency: `${ms}ms`,
        detail: error && error.statusCode === 404 ? 'No avatars bucket (OK)' : 'Storage accessible',
      });
    } catch (err) {
      results.push({ name: 'Storage', status: 'fail', detail: err.message });
    }

    // 6. Vercel Deployment
    try {
      const start = performance.now();
      await fetch(`${DEPLOYMENT_URL}/home`, { method: 'HEAD', mode: 'no-cors' });
      const ms = Math.round(performance.now() - start);
      results.push({
        name: 'Vercel Deployment',
        status: 'pass',
        latency: `${ms}ms`,
        detail: 'Deployment reachable',
      });
    } catch (err) {
      results.push({ name: 'Vercel Deployment', status: 'fail', detail: err.message });
    }

    setChecks(results);
    setLastRun(new Date().toLocaleTimeString());
    setRunning(false);
  }

  useEffect(() => {
    runHealthChecks();
    const interval = setInterval(runHealthChecks, 30000);
    return () => clearInterval(interval);
  }, []);

  const allPass = checks.length > 0 && checks.every((c) => c.status === 'pass');
  const passCount = checks.filter((c) => c.status === 'pass').length;
  const realtimeSurfaces = Object.entries(realtimeHealth.surfaces || {});
  const realtimeCounts = realtimeSurfaces.reduce(
    (acc, [, surface]) => {
      const status = surface?.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    { subscribed: 0, reconnecting: 0, stale: 0, error: 0, unknown: 0 }
  );

  if (checks.length === 0 && running) {
    return (
      <AdminLayout>
        <div className="mb-4">
          <h2 className="font-display text-xl font-bold">System Health</h2>
          <p className="text-sm text-muted-foreground">Running checks...</p>
        </div>
        <Skeleton className="mb-4 h-32 w-full" />
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">System Health</h2>
          <p className="text-sm text-muted-foreground">
            {lastRun ? `Last checked: ${lastRun}` : 'Running checks...'}
          </p>
          <a
            href={DEPLOYMENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> {DEPLOYMENT_URL}
          </a>
        </div>
        <Button
          onClick={runHealthChecks}
          disabled={running}
          variant="outline"
          size="sm"
        >
          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
          {running ? 'Checking...' : 'Refresh'}
        </Button>
      </div>

      {/* Overall status */}
      <Card className={cn('rr-surface rounded-[20px] border-l-4', allPass ? 'border-l-success' : 'border-l-destructive')}>
        <CardContent className="flex items-center gap-4 py-6">
          {allPass ? (
            <CheckCircle className="h-8 w-8 text-success" />
          ) : (
            <XCircle className="h-8 w-8 text-destructive" />
          )}
          <div>
            <p className="text-lg font-semibold">
              {allPass ? 'All Systems Operational' : 'Some Checks Failed'}
            </p>
            <p className="text-sm text-muted-foreground">
              {passCount} / {checks.length} checks passing
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 rounded-[20px] border border-border bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Realtime surfaces
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Coarse internal health only. No payloads, locations, message text, or channel IDs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wider">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
              {realtimeCounts.subscribed} subscribed
            </span>
            <span className="rounded-full bg-warning/10 px-2.5 py-1 text-warning">
              {realtimeCounts.reconnecting} reconnecting
            </span>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-muted-foreground">
              {realtimeCounts.stale} stale
            </span>
            <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-destructive">
              {realtimeCounts.error} error
            </span>
          </div>
        </div>

        <div className="mb-3 text-xs text-muted-foreground">
          Last resume refresh: {formatHealthTime(realtimeHealth.lastResumeRefreshAt)}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {realtimeSurfaces.map(([surfaceName, surfaceState]) => {
            const status = surfaceState?.status || 'unknown';
            const statusClass =
              status === 'subscribed'
                ? 'bg-primary/10 text-primary'
                : status === 'reconnecting'
                  ? 'bg-warning/10 text-warning'
                  : status === 'stale'
                    ? 'bg-secondary text-muted-foreground'
                    : status === 'error'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-muted text-muted-foreground';

            return (
              <div
                key={surfaceName}
                className="rounded-[18px] border border-border/70 bg-background/50 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold capitalize">
                    {surfaceName.replace(/-/g, ' ')}
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider',
                      statusClass
                    )}
                  >
                    {status}
                  </span>
                </div>
                <div className="mt-2 grid gap-1 text-[11px] text-muted-foreground">
                  <div>Last success: {formatHealthTime(surfaceState?.lastSuccessAt)}</div>
                  <div>Last error: {formatHealthTime(surfaceState?.lastErrorAt)}</div>
                  <div>Last resume: {formatHealthTime(surfaceState?.lastResumeRefreshAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Individual checks */}
      <div className="mt-4 grid gap-3">
        {checks.map((check) => (
          <Card key={check.name} className={cn('rr-surface', 'rounded-[20px]')}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                {check.status === 'pass' ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <div>
                  <p className="font-medium">{check.name}</p>
                  <p className="text-xs text-muted-foreground">{check.detail}</p>
                </div>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">{check.latency}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
