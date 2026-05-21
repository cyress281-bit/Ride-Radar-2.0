import { cn } from '@/lib/utils.js';
import AdminBackLink from './AdminBackLink.jsx';
import RRLogo from '@/components/RRLogo';

/**
 * Admin page shell with back link to /home and "Command Center" branding.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export default function AdminLayout({ children, className }) {
  return (
    <div className={cn('mx-auto max-w-5xl px-4 py-5 sm:px-5 sm:py-6', className)}>
      <AdminBackLink />
      <div className="relative mb-6 overflow-hidden rounded-[28px] border border-white/[0.08] bg-black/55 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.24)] sm:p-5">
        <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
        <div className="relative flex items-center gap-3">
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
      </div>
      {children}
    </div>
  );
}
