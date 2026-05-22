import { useState, useRef, useCallback, useEffect, memo, useId } from 'react';
import { Trash2, Loader2, Send } from 'lucide-react';
import SafetyActions from '@/components/safety/SafetyActions';
import {
  usePostComments,
  useAddPostComment,
  useDeletePostComment,
} from '@/features/profile/hooks/use-post-comments';
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

function CommentRow({ comment, currentUserId, postOwnerId, postId, onDelete, isDeleting }) {
  const profile = comment.user_profiles;
  const authorName = profile?.display_name || profile?.username || 'Rider';
  const canDelete =
    currentUserId &&
    (currentUserId === comment.author_id || currentUserId === postOwnerId);

  return (
    <div className="flex items-start gap-2.5 px-4 py-2">
      <CommentAvatar profile={profile} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-foreground leading-none">
            {authorName}
          </span>
          <span className="text-[10px] text-muted-foreground leading-none">
            {timeAgo(comment.created_at)}
          </span>
        </div>
        <p className="text-sm text-foreground/80 leading-snug mt-0.5 break-words">
          {comment.body}
        </p>
        {currentUserId && currentUserId !== comment.author_id && (
          <div className="mt-2 flex justify-end">
            <SafetyActions
              targetType="post_comment"
              targetId={comment.id}
              targetProfileId={comment.author_id}
              targetParentId={postId}
              targetContext={{ post_id: postId }}
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

const PostComments = memo(function PostComments({ postId, postOwnerId, currentUserId }) {
  const inputId = useId();
  const [body, setBody] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const bottomRef = useRef(null);
  const prevLengthRef = useRef(null);

  const { data: comments = [], isLoading } = usePostComments(postId);
  const addComment = useAddPostComment();
  const deleteComment = useDeletePostComment();

  // Scroll newest comment into view on live update; skip the initial data load
  useEffect(() => {
    if (isLoading) return;
    if (prevLengthRef.current === null) {
      prevLengthRef.current = comments.length;
      return;
    }
    if (comments.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    prevLengthRef.current = comments.length;
  }, [comments.length, isLoading]);

  const handleSend = useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed || addComment.isPending) return;
    try {
      await addComment.mutateAsync({ postId, body: trimmed });
      setBody('');
    } catch {
      // error toast handled by hook
    }
  }, [body, postId, addComment]);

  const handleDelete = useCallback(
    async (commentId) => {
      setDeletingId(commentId);
      try {
        await deleteComment.mutateAsync({ commentId, postId });
      } catch {
        // error toast handled by hook
      } finally {
        setDeletingId(null);
      }
    },
    [postId, deleteComment],
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

  return (
    <div className="border-t border-white/[0.06]">
      {/* Count / empty state */}
      <div className="px-4 pt-3 pb-1">
        <span className="text-xs font-semibold text-muted-foreground">
          {isLoading
            ? 'Loading…'
            : comments.length === 0
              ? 'No comments yet'
              : comments.length === 1
                ? '1 comment'
                : comments.length >= 50
                  ? '50+ comments'
                  : `${comments.length} comments`}
        </span>
      </div>

      {/* Comment list */}
      {!isLoading &&
        comments.map((comment) => (
          <CommentRow
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            postOwnerId={postOwnerId}
            postId={postId}
            onDelete={handleDelete}
            isDeleting={deletingId === comment.id}
          />
        ))}

      {/* scroll anchor — scroll-mb-20 ensures scrollIntoView clears the sticky composer */}
      <div ref={bottomRef} className="scroll-mb-20" aria-hidden="true" />

      {/* Composer */}
      <div className="sticky bottom-0 flex items-center gap-2 px-4 py-3 border-t border-white/[0.06] bg-surface/95 backdrop-blur-xl">
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
          className="flex items-center justify-center h-9 w-9 rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-all active:scale-95"
          aria-label="Send comment"
        >
          {addComment.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
});

export default PostComments;
