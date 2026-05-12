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
    <div className="min-h-dvh bg-[hsl(220_25%_4%)] px-5 pt-5 pb-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <RRLogo size="lg" className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(0_0%_96%)]">Data Safety Summary</h1>
          <p className="mt-2 text-sm text-[hsl(220_8%_52%)]">
            Ride Radar is committed to protecting rider privacy and data security.
          </p>
        </div>

        <div className="grid gap-4">
          {items.map((item, index) => (
            <Card key={item.title} className="rounded-[20px] border border-[hsl(220_12%_16%)] bg-[hsl(220_20%_7%)] transition-colors hover:border-[#6BBF00]/20">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#6BBF00]/10">
                  <item.icon className="h-4 w-4 text-[#6BBF00]" />
                </div>
                <CardTitle className="text-base text-[hsl(0_0%_96%)]">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[hsl(220_8%_52%)]">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-[20px] border border-[#6BBF00]/15 bg-[#6BBF00]/5 p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#6BBF00]/15">
              <CheckCircle className="h-3.5 w-3.5 text-[#6BBF00]" />
            </div>
            <span className="text-sm font-medium text-[hsl(0_0%_96%)]">No data shared with third parties</span>
          </div>
          <p className="mt-2 text-xs text-[hsl(220_8%_52%)]">
            Analytics are anonymized. No advertising trackers. No sale of personal data.
          </p>
        </div>
      </div>
    </div>
  );
}
