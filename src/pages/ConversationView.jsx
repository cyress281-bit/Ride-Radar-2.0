import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Clock } from 'lucide-react';
import SafetyActions from '@/components/safety/SafetyActions';
import { useMyProfile } from '@/lib/useCurrentUser';
import { cn } from '@/lib/utils';
import { getProfileByIdSafe } from '@/lib/profileLookup';

export default function ConversationView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useMyProfile();
  const [text, setText] = useState('');
  const endRef = useRef(null);

  const { data: conversation } = useQuery({
    queryKey: ['conversation', id],
    queryFn: async () => await base44.entities.Conversation.get(id),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', id],
    queryFn: async () => await base44.entities.Message.filter({ conversationId: id }, 'created_date', 200),
    refetchInterval: 5000,
  });

  const otherId = conversation?.participantIds?.find((p) => p !== profile?.id);
  const { data: other } = useQuery({
    queryKey: ['profile', otherId],
    enabled: !!otherId,
    queryFn: async () => await getProfileByIdSafe(otherId),
  });

  const { data: blocks = [] } = useQuery({
    queryKey: ['blocks', profile?.id, otherId],
    enabled: !!profile?.id && !!otherId,
    queryFn: async () => await base44.entities.UserBlock.filter({ blockerProfileId: profile.id, blockedProfileId: otherId }),
  });

  const isBlocked = blocks.length > 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = useMutation({
    mutationFn: async () => {
      const body = text.trim();
      if (!body) return;
      await base44.entities.Message.create({ conversationId: id, fromUserId: profile.id, body });
      const update = { lastMessageAt: new Date().toISOString() };
      if (conversation.type === 'connection') {
        update.threadExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
      }
      await base44.entities.Conversation.update(id, update);
      await base44.functions.invoke('sendNotification', {
        targetProfileId: otherId,
        type: 'new_message',
        title: `New message from @${profile.username}`,
        body: body.slice(0, 100),
        relatedEntityId: id,
        relatedEntityType: 'Conversation',
      });
    },
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['messages', id] });
      qc.invalidateQueries({ queryKey: ['conversation', id] });
    },
  });

  const isArchived = conversation?.status === 'archived';
  const expiresAt = conversation?.threadExpiresAt;
  const hoursLeft = expiresAt ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 3600000)) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-5rem)]">
      <div className="px-5 py-3 border-b border-border/60 flex items-center gap-3 bg-background/90 backdrop-blur">
        <button onClick={() => navigate('/messages')} className="p-1 hover:bg-secondary rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        {other && (
          <Link to={`/profile/${other.id}`} className="flex items-center gap-2.5 flex-1 min-w-0">
            {other.avatar ? (
              <img src={other.avatar} className="w-9 h-9 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-semibold text-sm">
                {other.displayName?.[0] || '?'}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{other.displayName}</div>
              <div className="text-xs text-muted-foreground truncate">@{other.username}</div>
            </div>
          </Link>
        )}
        {other && (
          <SafetyActions targetType="conversation" targetId={id} targetProfileId={other.id} compact />
        )}
        {conversation?.type === 'connection' && !isArchived && hoursLeft !== null && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
            <Clock className="w-3 h-3" /> {hoursLeft}h
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {conversation?.type === 'connection' && (
          <div className="text-center text-[11px] text-muted-foreground pb-2">
            This thread expires 72 hours after the last message.
          </div>
        )}
        {messages.map((m) => {
          const mine = m.fromUserId === profile?.id;
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[75%] px-3.5 py-2 rounded-2xl text-[14.5px] leading-relaxed',
                mine ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-secondary text-secondary-foreground rounded-bl-md'
              )}>
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-border/60 bg-background/90 backdrop-blur">
        {isArchived ? (
          <div className="text-center text-sm text-muted-foreground py-2">This conversation is archived.</div>
        ) : isBlocked ? (
          <div className="text-center text-sm text-muted-foreground py-2">You blocked this rider. Messaging is disabled.</div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send.mutate(); } }}
              placeholder="Message..."
              className="rounded-full"
            />
            <Button onClick={() => send.mutate()} disabled={send.isPending || !text.trim()} size="icon" className="rounded-full shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}