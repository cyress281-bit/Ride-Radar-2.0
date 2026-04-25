import { Link } from 'react-router-dom';
import AdminBackLink from '@/components/admin/AdminBackLink';
import { ACCOUNT_DELETION_URL, PRIVACY_POLICY_URL, SUPPORT_URL } from '@/pages/PrivacyPolicy';
import { Database, ExternalLink, FileText, LifeBuoy, Trash2 } from 'lucide-react';

const links = [
  { to: PRIVACY_POLICY_URL, label: 'Privacy Policy', icon: FileText },
  { to: SUPPORT_URL, label: 'Support Page', icon: LifeBuoy },
  { to: ACCOUNT_DELETION_URL, label: 'Account Deletion Page', icon: Trash2 },
  { to: '/review-readiness', label: 'Data Safety Summary', icon: Database },
];

export default function AdminCompliance() {
  return (
    <div className="px-5 pt-5">
      <AdminBackLink />
      <h1 className="mb-1 font-display text-2xl font-bold tracking-tight">Compliance</h1>
      <p className="mb-5 text-sm text-muted-foreground">Quick access to review-readiness and store policy resources.</p>
      <div className="space-y-2">
        {links.map((item) => item.to.startsWith('http') ? (
          <a key={item.to} href={item.to} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 hover:border-primary/40">
            <item.icon className="h-5 w-5 text-primary" />
            <span className="flex-1 font-semibold text-sm">{item.label}</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        ) : (
          <Link key={item.to} to={item.to} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 hover:border-primary/40">
            <item.icon className="h-5 w-5 text-primary" />
            <span className="flex-1 font-semibold text-sm">{item.label}</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}