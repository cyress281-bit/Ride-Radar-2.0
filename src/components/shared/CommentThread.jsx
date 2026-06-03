import { useState, useRef, useCallback, useEffect, memo, useId } from 'react';
import { Trash2, Loader2, Send } from 'lucide-react';
import { timeAgo } from '@/lib/broadcastUtils';
import SafetyActions from '@/components/safety/SafetyActions';

// ------------------------------------------------------------------
// Sub-components (extracted from both BroadcastComments and PostComments)
// ------------------------------------------------------------------

function CommentAvatar({ profile }) {
  const name = profile?.display_name || profile?.username || 'R';
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={name}
        className="h-7 w-7 rounded-full object-cover shrink-0 bg-white/[0.06]"
      />
    );
  }
  return (
    <div className="h-7 w-7 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0">
      <span className="text-[11px] font-bold text-muted-foreground">
        {name[0].toUpperCase()}
      </span>
    </div>
  );
}

function CommentRow({
  comment,
  currentUserId,
  entityOwnerId,
  entityId,
  onDelete,
  isDeleting,
  showSafetyActions,
}) {
  const profile = comment.user_profiles;
  const authorName = profile?.display_name || profile?.username || 'Rider';
  const canDelete =
    currentUserId &&
    (currentUserId === comment.author_id || currentUserId === entityOwnerId);

  return (
    <div className="flex items-start gap-2.5 py-2">
      <CommentAvatar profile={profile} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-foreground leading-none">
            {authorName}
          </span>
          {profile?.username && (
            <span className="text-[10px] text-muted-foreground/60 leading-none">
              @{profile.username}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground leading-none">
            {timeAgo(comment.created_at)}
          </span>
        </div>
        <p className="text-sm text-foreground/80 leading-snug mt-0.5 break-words">
          {comment.body}
        </p>
        {showSafetyActions && currentUserId && currentUserId !== comment.author_id && (
          <div className="mt-2 flex justify-end">
            <SafetyActions
              targetType="post_comment"
              targetId={comment.id}
              targetProfileId={comment.author_id}
              targetParentId={entityId}
              targetContext={{ post_id: entityId }}
              compact
              className="justify-end"
            />
          </div>
        )}
      </div>
      {canDelete && (
        <button
          onClick={() => onDelete(comment.id)}
          disabled={isDeleting}
          className="flex items-center justify-center h-7 w-7 rounded-full text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 shrink-0"
          aria-label="Delete comment"
        >
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Main component
// ------------------------------------------------------------------

const CommentThread = memo(function CommentThread({
  entityId,
  entityOwnerId,
  currentUserId,
  comments = [],
  isLoading,
  onAdd,
  onDelete,
  isActive = true,
  stickyComposer = false,
  dockComposer = false,
  showSafetyActions = false,
  autoScroll = false,
  countIcon = null,
  countLabel,
}) {
  const inputId = useId();
  const [body, setBody] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const bottomRef = useRef(null);
  const prevLengthRef = useRef(null);

  // Auto-scroll to newest comment
  useEffect(() => {
    if (!autoScroll || isLoading) return;
    if (prevLengthRef.current === null) {
      prevLengthRef.current = comments.length;
      return;
    }
    if (comments.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    prevLengthRef.current = comments.length;
  }, [comments.length, isLoading, autoScroll]);

  const handleSend = useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed || onAdd.isPending) return;
    try {
      await onAdd.mutateAsync({ entityId, body: trimmed });
      setBody('');
    } catch {
      // error toast handled by caller hook
    }
  }, [body, onAdd]);

  const handleDelete = useCallback(
    async (commentId) => {
      setDeletingId(commentId);
      try {
        await onDelete.mutateAsync({ commentId, entityId });
      } catch {
        // error toast handled by caller hook
      } finally {
        setDeletingId(null);
      }
    },
    [entityId, onDelete]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const canSend = body.trim().length > 0 && !onAdd.isPending;

  // Count label
  const resolvedCountLabel =
    countLabel ??
    (isLoading
      ? 'Comments'
      : comments.length === 0
        ? 'No comments yet'
        : comments.length === 1
          ? '1 comment'
          : comments.length >= 50
            ? '50+ comments'
            : `${comments.length} comments`);

  const composer = (
    <div
      className={
        dockComposer
          ? 'fixed bottom-0 left-0 right-0 z-20 flex items-center gap-2 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-white/[0.06] bg-surface/95 backdrop-blur-xl'
          : stickyComposer
            ? 'sticky bottom-0 flex items-center gap-2 px-4 py-3 border-t border-white/[0.06] bg-surface/95 backdrop-blur-xl'
            : 'flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]'
      }
      style={
        dockComposer
          ? { transform: 'translateY(calc(-1 * var(--rr-keyboard-height, 0px)))', transition: 'transform 0.2s ease-out' }
          : undefined
      }
    >
      <input
        id={inputId}
        type="text"
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 500))}
        onKeyDown={handleKeyDown}
        placeholder="Add a comment…"
        disabled={onAdd.isPending}
        className="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.08] rounded-full px-4 py-2 text-base placeholder:text-muted-foreground/50 focus:outline-none focus:border-white/20 transition-colors disabled:opacity-50"
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        className="flex items-center justify-center h-9 w-9 rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-all active:scale-95 shrink-0"
        aria-label="Send comment"
      >
        {onAdd.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </button>
    </div>
  );

  return (
    <div>
      {/* Count label */}
      <div className={stickyComposer ? 'px-4 pt-3 pb-1' : 'flex items-center gap-2 mb-3'}>
        {countIcon && <span className="text-muted-foreground/60">{countIcon}</span>}
        <span
          className={
            stickyComposer
              ? 'text-xs font-semibold text-muted-foreground'
              : 'text-xs font-bold uppercase tracking-widest text-muted-foreground'
          }
        >
          {resolvedCountLabel}
        </span>
      </div>

      {/* Loading spinner (only for non-sticky layout; sticky uses count label) */}
      {!stickyComposer && isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
        </div>
      )}

      {/* Empty state (only for non-sticky layout) */}
      {!stickyComposer && !isLoading && comments.length === 0 && (
        <p className="text-sm text-muted-foreground/50 py-1">No comments yet.</p>
      )}

      {/* Comment list */}
      {!isLoading &&
        comments.map((comment) => (
          <CommentRow
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            entityOwnerId={entityOwnerId}
            entityId={entityId}
            onDelete={handleDelete}
            isDeleting={deletingId === comment.id}
            showSafetyActions={showSafetyActions}
          />
        ))}

      {/* Scroll anchor */}
      {autoScroll && <div ref={bottomRef} className="scroll-mb-20" aria-hidden="true" />}

      {/* Composer or closed message */}
      {isActive ? (
        composer
      ) : (
        <p className="text-xs text-muted-foreground/40 mt-3 pt-3 border-t border-white/[0.06]">
          Comments are closed for this signal.
        </p>
      )}
    </div>
  );
});

export default CommentThread;
