import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Shield, Lock, Eye, Trash2 } from 'lucide-react';
import RRLogo from '@/components/RRLogo';

/**
 * Review Readiness Page — Data Safety Summary for app store compliance.
 */
export default function ReviewReadinessPage() {
  const items = [
    {
      icon: Shield,
      title: 'Row-Level Security (RLS)',
      description: 'All database tables enforce RLS. Users can only access their own data.',
    },
    {
      icon: Lock,
      title: 'Authentication',
      description: 'Secure Supabase Auth with email/password and OAuth. Sessions expire automatically.',
    },
    {
      icon: Eye,
      title: 'Privacy Controls',
      description: 'Users control profile visibility, live map presence, and location precision.',
    },
    {
      icon: Trash2,
      title: 'Account Deletion',
      description: 'Self-service account deletion permanently removes all user data.',
    },
  ];

  return (
    <div className="min-h-dvh px-5 pt-5 pb-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <RRLogo size="lg" className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight">Data Safety Summary</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ride Radar is committed to protecting rider privacy and data security.
          </p>
        </div>

        <div className="grid gap-4">
          {items.map((item) => (
            <Card key={item.title} className="rr-surface hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <item.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">No data shared with third parties</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Analytics are anonymized. No advertising trackers. No sale of personal data.
          </p>
        </div>
      </div>
    </div>
  );
}
