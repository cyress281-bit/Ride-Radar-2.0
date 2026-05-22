import { cn } from '@/lib/utils.js';
import AdminBackLink from './AdminBackLink.jsx';
import RRLogo from '@/components/RRLogo';
import { Link } from 'react-router-dom';
import { ChevronRight, Radio, ShieldAlert, Users, Bell } from 'lucide-react';

/**
 * Admin page shell with back link to /home and "Command Center" branding.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export default function AdminLayout({ children, className }) {
  return (
    <div className={cn('min-h-dvh bg-background mx-auto max-w-5xl px-4 py-5 sm:px-5 sm:py-6', className)}>
      <AdminBackLink />
      <div className="relative mb-6 overflow-hidden rounded-[28px] border border-white/[0.08] bg-black/60 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.24)] sm:p-5">
        <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/[0.06] blur-3xl pointer-events-none" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <RRLogo size="md" />
            <div>
              <div className="mb-1 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Command Center
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Admin Command Center
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Moderation, compliance, operations, and platform management.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-[220px] sm:grid-cols-1">
            <Link
              to="/admin/events"
              className="flex items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-white/[0.035] px-3 py-2.5 text-left text-xs font-semibold text-foreground transition-colors hover:border-primary/25 hover:bg-primary/[0.05]"
            >
              <span className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" />
                Events
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              to="/admin/reports"
              className="flex items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-white/[0.035] px-3 py-2.5 text-left text-xs font-semibold text-foreground transition-colors hover:border-primary/25 hover:bg-primary/[0.05]"
            >
              <span className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Reports
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              to="/admin/users"
              className="flex items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-white/[0.035] px-3 py-2.5 text-left text-xs font-semibold text-foreground transition-colors hover:border-primary/25 hover:bg-primary/[0.05]"
            >
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Users
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              to="/admin/notifications"
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/20 hover:bg-primary/[0.04] hover:text-foreground sm:hidden"
            >
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                Feedback
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
