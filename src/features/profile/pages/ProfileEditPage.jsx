import { useNavigate } from 'react-router-dom';
import { useAuthState } from '@/features/auth/hooks/use-auth';
import ProfileEditForm from '@/features/profile/components/ProfileEditForm';
import { useMemo } from 'react';

const profileAmbientTopStyle = {
  background:
    'radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.14), transparent 42%), radial-gradient(circle at 18% 14%, hsl(var(--cyan) / 0.08), transparent 30%), radial-gradient(circle at 82% 10%, hsl(var(--brand-amber) / 0.06), transparent 28%)',
};

const profileAmbientBottomStyle = {
  background:
    'linear-gradient(180deg, transparent 0%, hsl(240 20% 2% / 0.10) 36%, hsl(240 20% 2% / 0.34) 100%)',
};

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuthState();

  const displayProfile = useMemo(
    () =>
      profile || {
        user_id: user?.id,
        display_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
        bio: '',
        bike_make: '',
        bike_model: '',
        avatar_url: '',
        bike_photo_url: '',
        is_public: true,
        location: '',
        created_at: user?.created_at,
      },
    [profile, user]
  );

  return (
    <div className="relative isolate mx-auto max-w-2xl px-4 pt-4 pb-8 animate-fade-up bg-background min-h-dvh">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] opacity-100" style={profileAmbientTopStyle} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[12rem]" style={profileAmbientBottomStyle} />
      <div className="relative z-10">
        <ProfileEditForm profile={displayProfile} onDone={() => navigate('/profile', { replace: true })} />
      </div>
    </div>
  );
}
