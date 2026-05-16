import { useState, useCallback, memo, useId } from 'react';
import { Trash2, Loader2, Send, MessageCircle } from 'lucide-react';
import {
  useBroadcastComments,
  useAddBroadcastComment,
  useDeleteBroadcastComment,
} from '@/features/broadcast/hooks/use-broadcast-comments.js';
import { timeAgo } from '@/lib/broadcastUtils';

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

function CommentRow({ comment, currentUserId, broadcastAuthorId, broadcastId, onDelete, isDeleting }) {
  const profile = comment.user_profiles;
  const authorName = profile?.display_name || profile?.username || 'Rider';
  const canDelete =
    currentUserId &&
    (currentUserId === comment.author_id || currentUserId === broadcastAuthorId);

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
      </div>
      {canDelete && (
        <button
          onClick={() => onDelete(comment.id, broadcastId)}
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

const BroadcastComments = memo(function BroadcastComments({
  broadcastId,
  broadcastAuthorId,
  currentUserId,
  isActive,
}) {
  const inputId = useId();
  const [body, setBody] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const { data: comments = [], isLoading } = useBroadcastComments(broadcastId);
  const addComment = useAddBroadcastComment();
  const deleteComment = useDeleteBroadcastComment();

  const handleSend = useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed || addComment.isPending) return;
    try {
      await addComment.mutateAsync({ broadcastId, body: trimmed });
      setBody('');
    } catch {
      // error toast handled by hook
    }
  }, [body, broadcastId, addComment]);

  const handleDelete = useCallback(
    async (commentId) => {
      setDeletingId(commentId);
      try {
        await deleteComment.mutateAsync({ commentId, broadcastId });
      } catch {
        // error toast handled by hook
      } finally {
        setDeletingId(null);
      }
    },
    [broadcastId, deleteComment],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const canSend = body.trim().length > 0 && !addComment.isPending;

  const countLabel = isLoading
    ? 'Comments'
    : comments.length === 1
      ? '1 comment'
      : `${comments.length} comments`;

  return (
    <div className="mt-4 rounded-[20px] backdrop-blur-xl bg-surface/80 border border-white/[0.06] p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="h-4 w-4 text-muted-foreground/60" />
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {countLabel}
        </span>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
        </div>
      )}

      {!isLoading && comments.length === 0 && (
        <p className="text-sm text-muted-foreground/50 py-1">No comments yet.</p>
      )}

      {!isLoading &&
        comments.map((comment) => (
          <CommentRow
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            broadcastAuthorId={broadcastAuthorId}
            broadcastId={broadcastId}
            onDelete={handleDelete}
            isDeleting={deletingId === comment.id}
          />
        ))}

      {isActive ? (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]">
          <input
            id={inputId}
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 500))}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment…"
            disabled={addComment.isPending}
            className="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.08] rounded-full px-4 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-white/20 transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="flex items-center justify-center h-9 w-9 rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-all active:scale-95 shrink-0"
            aria-label="Send comment"
          >
            {addComment.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/40 mt-3 pt-3 border-t border-white/[0.06]">
          Comments are closed for this signal.
        </p>
      )}
    </div>
  );
});

export default BroadcastComments;
