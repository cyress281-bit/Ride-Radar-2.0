import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase.js';
import { cn } from '@/lib/utils.js';

/**
 * Admin Health Monitor — Real-time system health dashboard.
 */
export default function AdminHealthPage() {
  const [checks, setChecks] = useState([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);

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
      const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
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
        status: error && error.code === '42883' ? 'fail' : 'pass',
        latency: `${ms}ms`,
        detail: error && error.code === '42883' ? 'RPC not found' : 'RPC callable',
      });
    } catch (err) {
      results.push({ name: 'PostGIS RPC', status: 'fail', detail: err.message });
    }

    // 4. Realtime
    try {
      const channel = supabase.channel('health-check');
      const start = performance.now();
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
        channel.subscribe((status) => {
          clearTimeout(timeout);
          resolve(status);
        });
      });
      const ms = Math.round(performance.now() - start);
      supabase.removeChannel(channel);
      results.push({
        name: 'Realtime Channel',
        status: 'pass',
        latency: `${ms}ms`,
        detail: 'Subscribed',
      });
    } catch (err) {
      results.push({ name: 'Realtime Channel', status: 'fail', detail: err.message });
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

  return (
    <div className="min-h-screen p-4 pt-20">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
            <p className="text-sm text-muted-foreground">
              {lastRun ? `Last checked: ${lastRun}` : 'Running checks...'}
            </p>
          </div>
          <Button
            onClick={runHealthChecks}
            disabled={running}
            className="rr-premium-input"
          >
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
            {running ? 'Checking...' : 'Refresh'}
          </Button>
        </div>

        {/* Overall status */}
        <Card className={cn('rr-surface border-l-4', allPass ? 'border-l-green-500' : 'border-l-red-500')}>
          <CardContent className="flex items-center gap-4 py-6">
            {allPass ? (
              <CheckCircle className="h-8 w-8 text-green-500" />
            ) : (
              <XCircle className="h-8 w-8 text-red-500" />
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

        {/* Individual checks */}
        <div className="grid gap-3">
          {checks.map((check) => (
            <Card key={check.name} className="rr-surface">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  {check.status === 'pass' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
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

        {checks.length === 0 && running && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
