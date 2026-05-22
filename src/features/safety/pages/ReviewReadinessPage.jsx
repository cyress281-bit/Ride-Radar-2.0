import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Shield, Lock, Eye, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
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
    <div className="min-h-dvh bg-background px-5 pt-5 pb-nav-safe">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          to="/settings"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground pressable self-start"
        >
          <ArrowLeft className="h-4 w-4" /> Settings
        </Link>
        <div className="text-center">
          <RRLogo size="lg" className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Data Safety Summary</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ride Radar is committed to protecting rider privacy and data security.
          </p>
        </div>

        <div className="grid gap-4">
          {items.map((item, _index) => (
            <Card key={item.title} className="rounded-[20px] border border-border bg-card transition-colors hover:border-primary/20">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base text-foreground">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-[20px] border border-primary/15 bg-primary/5 p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <CheckCircle className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Ride Radar does not sell user data</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Ride Radar may use service providers for hosting, authentication, storage, analytics, crash/error reporting,
            security, and app operations. When configured or enabled, analytics and crash/error reporting may be
            collected to help operate, secure, improve, and support the app.
          </p>
        </div>
      </div>
    </div>
  );
}
