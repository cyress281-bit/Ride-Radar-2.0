import { memo, useState, useCallback } from 'react';
import { X, Trash2, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDeletePost } from '@/features/profile/hooks/use-user-posts';
import { timeAgo } from '@/lib/broadcastUtils';
import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/primitives/Text';
import { VStack } from '@/components/ui/primitives/Stack';
import OptimizedImage from '@/components/shared/OptimizedImage';
import PostComments from '@/features/profile/components/PostComments';

/**
 * PostDetailSheet — full-screen overlay for viewing a post and optionally deleting it.
 *
 * @param {{ post: object, onClose: () => void, userId: string }} props
 */
const PostDetailSheet = memo(function PostDetailSheet({ post, onClose, userId, canDelete = false }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const deletePost = useDeletePost();

  const photos = post?.user_post_photos ?? [];
  const currentPhoto = photos[photoIdx];

  const handleDelete = useCallback(async () => {
    setError('');
    try {
      await deletePost.mutateAsync({ postId: post.id, userId });
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to delete post. Please try again.');
      setConfirmDelete(false);
    }
  }, [post?.id, userId, deletePost, onClose]);

  if (!post) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl overflow-y-auto animate-fade-up"
      role="dialog"
      aria-modal="true"
      aria-label="Post"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-surface/80 backdrop-blur-xl">
        <button
          onClick={onClose}
          className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-white/[0.06] transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <Text variant="bodySm" className="font-bold">Post</Text>
        {canDelete && (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={deletePost.isPending}
            className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
            aria-label="Delete post"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <VStack gap={0} className="max-w-2xl mx-auto">
        {/* Photo viewer */}
        {photos.length > 0 && (
          <div className="relative bg-black">
            <div className="flex items-center justify-center min-h-64 max-h-[60vh] overflow-hidden">
              <OptimizedImage
                key={currentPhoto?.id}
                src={currentPhoto?.image_url}
                alt={`Photo ${photoIdx + 1} of ${photos.length}`}
                containerClassName="w-full max-h-[60vh]"
                objectFit="contain"
                loading="eager"
                showSkeleton
              />
            </div>

            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setPhotoIdx((i) => Math.max(0, i - 1))}
                  disabled={photoIdx === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-30 transition-opacity"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setPhotoIdx((i) => Math.min(photos.length - 1, i + 1))}
                  disabled={photoIdx === photos.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-30 transition-opacity"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                {/* Dot scrubber */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIdx(i)}
                      className={cn(
                        'h-1.5 rounded-full transition-all',
                        i === photoIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/40'
                      )}
                      aria-label={`Go to photo ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Caption + meta */}
        <VStack gap={1.5} className="px-4 py-4">
          {post.caption && (
            <Text variant="body" color="default">{post.caption}</Text>
          )}
          <Text variant="micro" color="muted">{timeAgo(post.created_at)}</Text>
        </VStack>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" aria-hidden="true" />
            <Text variant="caption" className="text-destructive">{error}</Text>
          </div>
        )}

        {/* Comments */}
        <PostComments
          postId={post.id}
          postOwnerId={post.user_id}
          currentUserId={userId}
        />
      </VStack>

      {/* Delete confirmation */}
      {canDelete && confirmDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm pb-8"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-md mx-4 rounded-2xl border border-white/[0.06] bg-surface/95 backdrop-blur-xl p-4 animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <VStack gap={3}>
              <Text variant="bodySm" className="font-bold text-center">Delete this post?</Text>
              <Text variant="caption" color="muted" className="block text-center">
                This permanently removes the post and all its photos.
              </Text>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deletePost.isPending}
                  className="rounded-full border border-white/[0.06] py-2.5 text-sm font-bold transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deletePost.isPending}
                  className="rounded-full bg-destructive py-2.5 text-sm font-bold text-white transition-all hover:bg-destructive/90 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {deletePost.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Deleting…
                    </>
                  ) : 'Delete'}
                </button>
              </div>
            </VStack>
          </div>
        </div>
      )}
    </div>
  );
});

export default PostDetailSheet;
