import { memo } from 'react';
import { MessageCircle } from 'lucide-react';
import {
  useBroadcastComments,
  useAddBroadcastComment,
  useDeleteBroadcastComment,
} from '@/features/broadcast/hooks/use-broadcast-comments.js';
import CommentThread from '@/components/shared/CommentThread';

const BroadcastComments = memo(function BroadcastComments({
  broadcastId,
  broadcastAuthorId,
  currentUserId,
  isActive,
}) {
  const { data: comments = [], isLoading } = useBroadcastComments(broadcastId);
  const addComment = useAddBroadcastComment();
  const deleteComment = useDeleteBroadcastComment();

  return (
    <div className="mt-4 rounded-[20px] backdrop-blur-xl bg-surface/80 border border-white/[0.06] p-4">
      <CommentThread
        entityId={broadcastId}
        entityOwnerId={broadcastAuthorId}
        currentUserId={currentUserId}
        comments={comments}
        isLoading={isLoading}
        onAdd={addComment}
        onDelete={deleteComment}
        isActive={isActive}
        countIcon={<MessageCircle className="h-4 w-4" />}
      />
    </div>
  );
});

export default BroadcastComments;
