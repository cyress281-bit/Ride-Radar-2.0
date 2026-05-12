import { Link } from 'react-router-dom';
import {
  ExternalLink,
  FileText,
  LifeBuoy,
  Trash2,
  Database,
  ShieldCheck,
  ClipboardCheck,
  Lock,
  UserCog,
} from 'lucide-react';
import AdminPageShell from '@/features/admin/components/AdminPageShell.jsx';
import { Skeleton } from '@/components/ui/skeleton';
import AdminLayout from '@/features/admin/components/AdminLayout.jsx';

const quickLinks = [
  { to: '/privacy-policy', label: 'Privacy Policy', icon: FileText, external: false },
  { to: '/support', label: 'Support Page', icon: LifeBuoy, external: false },
  { to: '/account-deletion', label: 'Account Deletion Page', icon: Trash2, external: false },
  { to: '/review-readiness', label: 'Data Safety Summary', icon: Database, external: false },
];

const checklist = [
  { label: 'Privacy policy is up to date', icon: Lock },
  { label: 'Account deletion flow is functional', icon: Trash2 },
  { label: 'Support contact is accessible', icon: LifeBuoy },
  { label: 'Admin roles are restricted', icon: UserCog },
  { label: 'Moderation queue is monitored', icon: ShieldCheck },
  { label: 'Data safety form is reviewed', icon: ClipboardCheck },
];

/**
 * AdminCompliancePage - Quick links to compliance resources and checklist.
 */
export default function AdminCompliancePage() {
  return (
    <AdminPageShell
      skeleton={
        <AdminLayout>
          <Skeleton className="mb-4 h-7 w-32" />
          <div className="mb-6 space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-48 w-full" />
        </AdminLayout>
      }
    >
      <AdminComplianceContent />
    </AdminPageShell>
  );
}

function AdminComplianceContent() {
  return (
    <AdminLayout>
      <div className="mb-4">
        <h2 className="font-display text-xl font-bold">Compliance</h2>
      </div>

      <div className="mb-6 space-y-2">
        {quickLinks.map((item) => {
          const content = (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition hover:border-primary/40">
              <item.icon className="h-5 w-5 text-primary" />
              <span className="flex-1 text-sm font-semibold">{item.label}</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </div>
          );
          return item.external ? (
            <a
              key={item.to}
              href={item.to}
              target="_blank"
              rel="noopener noreferrer"
            >
              {content}
            </a>
          ) : (
            <Link key={item.to} to={item.to}>
              {content}
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center gap-2 font-bold">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          Compliance Checklist
        </div>
        <div className="space-y-2">
          {checklist.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/50 p-3 text-sm"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">{item.label}</span>
              <div className="h-4 w-4 rounded-full border border-border/60" />
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
