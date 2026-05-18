import NotificationItem from '@/features/notifications/components/NotificationItem.jsx';

/**
 * A dated section of notifications with staggered CSS entrance animations.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {Array<object>} props.notifications
 * @param {(n: object) => void} props.onMarkRead
 */
export default function NotificationSection({ title, notifications, onMarkRead, onDelete }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 px-1 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
          {title}
        </span>
        <hr className="flex-1 border-border/25" />
      </div>
      <div className="space-y-2">
        {notifications.map((n, index) => (
          <div
            key={n.id}
            className="will-change-transform transform-gpu animate-notification-in"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <NotificationItem notification={n} onMarkRead={onMarkRead} onDelete={onDelete} />
          </div>
        ))}
      </div>
    </div>
  );
}
