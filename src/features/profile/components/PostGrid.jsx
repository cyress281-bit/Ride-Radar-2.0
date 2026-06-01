import { memo } from 'react';
import { Camera, Images, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/primitives/Text';
import { EmptyState } from '@/components/shared/EmptyState';
import OptimizedImage from '@/components/shared/OptimizedImage';

/**
 * PostGrid — 3-column thumbnail grid for user posts.
 *
 * @param {{ posts: Array, onPostClick: (post: object) => void, onAddPost?: () => void }} props
 */
const PostGrid = memo(function PostGrid({
  posts = [],
  onPostClick,
  onAddPost,
  emptyDescription = 'Share bike photos, ride moments, or group shots here.',
}) {
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
          Add Shot
        </button>
      )}

      {posts.length === 0 ? (
        <div className="surface-card overflow-hidden rounded-2xl border border-white/[0.08] bg-surface/84 p-5 shadow-[0_16px_44px_hsl(0_0%_0%/0.28)] backdrop-blur-xl">
          <EmptyState
            icon={Camera}
            title="No shots yet"
            description={emptyDescription}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {posts.map((post) => {
            const firstPhoto = post.user_post_photos?.[0];
            const isMulti = (post.user_post_photos?.length ?? 0) > 1;

            return (
              <button
                key={post.id}
              onClick={() => onPostClick(post)}
              className={cn(
                'group relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/[0.10] bg-surface/86',
                'shadow-[0_16px_40px_hsl(0_0%_0%/0.32)] backdrop-blur-xl transition-all duration-200',
                'hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_18px_46px_hsl(0_0%_0%/0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
              )}
            >
              {firstPhoto ? (
                <OptimizedImage
                  src={firstPhoto.image_url}
                    alt={post.caption || 'Shot photo'}
                    containerClassName="h-full w-full"
                    className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
                    objectFit="cover"
                    loading="lazy"
                    disableAnimation
                    showSkeleton
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-surface">
                    <Camera className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                )}

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/8 to-black/0 opacity-90 transition-opacity group-hover:opacity-100" />

                {isMulti && (
                  <div className="absolute top-2 right-2 flex items-center rounded-full border border-white/[0.08] bg-black/60 px-2 py-1 backdrop-blur-sm">
                    <Images className="h-3 w-3 text-white" />
                  </div>
                )}

                {post.caption && (
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <Text variant="micro" className="text-white/95 line-clamp-2 text-left leading-snug">{post.caption}</Text>
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
