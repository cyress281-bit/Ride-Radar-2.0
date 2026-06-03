import { memo } from 'react';
import {
  usePostComments,
  useAddPostComment,
  useDeletePostComment,
} from '@/features/profile/hooks/use-post-comments';
import CommentThread from '@/components/shared/CommentThread';

const PostComments = memo(function PostComments({ postId, postOwnerId, currentUserId }) {
  const { data: comments = [], isLoading } = usePostComments(postId);
  const addComment = useAddPostComment();
  const deleteComment = useDeletePostComment();

  return (
    <div className="border-t border-white/[0.06]">
      <CommentThread
        entityId={postId}
        entityOwnerId={postOwnerId}
        currentUserId={currentUserId}
        comments={comments}
        isLoading={isLoading}
        onAdd={addComment}
        onDelete={deleteComment}
        stickyComposer
        dockComposer
        showSafetyActions
      />
    </div>
  );
});

export default PostComments;
