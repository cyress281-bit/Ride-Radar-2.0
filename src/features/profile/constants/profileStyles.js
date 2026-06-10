export const profileTabsListClass =
  'w-full flex justify-center gap-6 h-auto bg-transparent border-0 rounded-none p-0';

export const profileTabsTriggerClass =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-all data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none';

// Top ambient is intentionally transparent so the profile header sits on the
// plain black app background (--background) — matches the simplified app look.
export const profileAmbientTopStyle = {
  background: 'transparent',
};

export const profileAmbientBottomStyle = {
  background:
    'linear-gradient(180deg, transparent 0%, hsl(240 20% 2% / 0.10) 36%, hsl(240 20% 2% / 0.34) 100%)',
};
