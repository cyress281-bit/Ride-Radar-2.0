import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flag, ShieldOff, X } from 'lucide-react';
import { useMyProfile } from '@/lib/useCurrentUser';
import { cn } from '@/lib/utils';

const reasons = [
  { value: 'safety', label: 'Safety concern' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam or scam' },
  { value: 'illegal', label: 'Illegal activity' },
  { value: 'privacy', label: 'Privacy issue' },
  { value: 'other', label: 'Other' },
];

export default function SafetyActions({ targetType, targetId, targetProfileId, compact = false, className }) {
  const { data: profile } = useMyProfile();
  const qc = useQueryClient();
  const [mode, setMode] = useState(null);
  const [reason, setReason] = useState('safety');
  const [details, setDetails] = useState('');

  const canBlock = targetProfileId && targetProfileId !== profile?.id;

  const { data: existingBlocks = [] } = useQuery({
    queryKey: ['block-status', profile?.id, targetProfileId],
    enabled: !!profile?.id && !!targetProfileId,
    queryFn: async () => await base44.entities.UserBlock.filter({ blockerProfileId: profile.id, blockedProfileId: targetProfileId }),
  });

  const isBlocked = existingBlocks.length > 0;

  const report = useMutation({
    mutationFn: async () => await base44.functions.invoke('safetyAction', {
      action: 'report',
      targetType,
      targetId,
      targetProfileId,
      reason,
      details,
    }),
    onSuccess: () => {
      setMode('reported');
      setDetails('');
    },
  });

  const block = useMutation({
    mutationFn: async () => {
      if (isBlocked) return;
      await base44.functions.invoke('safetyAction', {
        action: 'block',
        blockedProfileId: targetProfileId,
        reason: details
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['block-status'] });
      qc.invalidateQueries({ queryKey: ['blocks'] });
      setMode('blocked');
      setDetails('');
    },
  });

  if (!profile || targetProfileId === profile.id) return null;

  if (mode === 'reported' || mode === 'blocked') {
    return (
      <div className={cn('rounded-xl border border-border/70 bg-black/35 p-3 text-sm text-muted-foreground', className)}>
        {mode === 'reported' ? 'Report submitted for review.' : 'User blocked. Their content and messages will be limited for you.'}
      </div>
    );
  }

  if (mode) {
    return (
      <div className={cn('rounded-xl border border-border/70 bg-black/35 p-3 space-y-3', className)}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-bold">{mode === 'report' ? 'Report' : 'Block user'}</div>
          <button onClick={() => setMode(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        {mode === 'report' && (
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{reasons.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Optional details for moderation review" rows={3} maxLength={500} />
        <Button
          variant={mode === 'block' ? 'destructive' : 'default'}
          onClick={() => mode === 'report' ? report.mutate() : block.mutate()}
          disabled={report.isPending || block.isPending || (mode === 'block' && isBlocked)}
          className="w-full rounded-lg"
        >
          {mode === 'block' && isBlocked ? 'Already blocked' : mode === 'report' ? 'Submit report' : 'Block user'}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-2', compact && 'justify-end', className)}>
      <Button variant="outline" size="sm" onClick={() => setMode('report')} className="rounded-lg text-muted-foreground">
        <Flag className="h-3.5 w-3.5" /> Report
      </Button>
      {canBlock && (
        <Button variant="outline" size="sm" onClick={() => setMode('block')} className="rounded-lg text-muted-foreground">
          <ShieldOff className="h-3.5 w-3.5" /> Block
        </Button>
      )}
    </div>
  );
}