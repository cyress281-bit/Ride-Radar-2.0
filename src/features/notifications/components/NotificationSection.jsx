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
      <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-primary">{title}</div>
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
