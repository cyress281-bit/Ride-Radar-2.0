import { memo } from 'react';
import { Grid3X3, Images, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/primitives/Text';
import { EmptyState } from '@/components/shared/EmptyState';
import OptimizedImage from '@/components/shared/OptimizedImage';

/**
 * PostGrid — 3-column thumbnail grid for user posts.
 *
 * @param {{ posts: Array, onPostClick: (post: object) => void, onAddPost?: () => void }} props
 */
const PostGrid = memo(function PostGrid({ posts = [], onPostClick, onAddPost }) {
  return (
    <div>
      {onAddPost && (
        <button
          onClick={onAddPost}
          className={cn(
            'w-full mb-4 flex items-center justify-center gap-2 rounded-full',
            'bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground',
            'transition-all hover:bg-primary/90 active:scale-95',
            'shadow-[0_4px_20px_hsl(var(--primary)/0.35)]'
          )}
        >
          <Plus className="h-4 w-4" />
          Add Post
        </button>
      )}

      {posts.length === 0 ? (
        <EmptyState
          icon={Grid3X3}
          title="No posts yet"
          description="Share bike photos, ride moments, or group pictures here."
        />
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {posts.map((post) => {
            const firstPhoto = post.user_post_photos?.[0];
            const isMulti = (post.user_post_photos?.length ?? 0) > 1;

            return (
              <button
                key={post.id}
                onClick={() => onPostClick(post)}
                className="relative aspect-square overflow-hidden rounded-lg bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {firstPhoto ? (
                  <OptimizedImage
                    src={firstPhoto.image_url}
                    alt={post.caption || 'Post photo'}
                    containerClassName="h-full w-full"
                    className="h-full w-full transition-transform duration-300 hover:scale-105"
                    objectFit="cover"
                    loading="lazy"
                    showSkeleton
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-surface">
                    <Grid3X3 className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                )}

                {isMulti && (
                  <div className="absolute top-1.5 right-1.5 flex items-center rounded-full bg-black/60 px-1.5 py-0.5">
                    <Images className="h-3 w-3 text-white" />
                  </div>
                )}

                {post.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <Text variant="micro" className="text-white line-clamp-1">{post.caption}</Text>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default PostGrid;
