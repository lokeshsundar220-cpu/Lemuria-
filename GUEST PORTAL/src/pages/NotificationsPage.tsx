import React, { useEffect } from 'react';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  at: number;
  read: boolean;
}

interface NotificationsPageProps {
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications,
  onMarkAllRead
}) => {
  useEffect(() => {
    if (notifications.some((n) => !n.read)) {
      onMarkAllRead();
    }
  }, [notifications, onMarkAllRead]);

  return (
    <>
      <h2>Notifications</h2>
      {notifications.length > 0 ? (
        <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
          {notifications.map((n) => (
            <div key={n.id} className={`card pad ${n.read ? '' : 'unread'}`}>
              <b>{n.title}</b> {!n.read && <span className="badge b-amber">New</span>}
              <p className="mute small" style={{ margin: '4px 0 0' }}>
                {n.body} ·{' '}
                {new Date(n.at).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card center">
          <div className="ic">✦</div>
          <h3>No notifications</h3>
          <p className="mute">Booking and stay updates will appear here.</p>
        </div>
      )}
    </>
  );
};
