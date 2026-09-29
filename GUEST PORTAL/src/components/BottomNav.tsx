import React from 'react';

interface BottomNavProps {
  user: { id: string; name: string } | null;
  isCheckedIn: boolean;
  unreadCount: number;
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  user,
  isCheckedIn,
  unreadCount,
  currentRoute,
  onNavigate
}) => {
  if (!user) return null;

  const links = [
    ['dashboard', 'Home'],
    [isCheckedIn ? 'stay' : 'my-bookings', isCheckedIn ? 'Stay' : 'Bookings'],
    ['services', 'Services'],
    ['notifications', 'Alerts'],
    ['profile', 'Profile']
  ];

  const icons: Record<string, string> = {
    Home: '⌂',
    Bookings: '▤',
    Stay: '▤',
    Services: '✦',
    Alerts: '♢',
    Profile: '☺'
  };

  const isActive = (route: string) => currentRoute === route || currentRoute.startsWith(`${route}/`);

  return (
    <nav className="bnav" aria-label="Main">
      {links.map(([route, label]) => (
        <button
          key={route}
          className={isActive(route) ? 'on' : ''}
          onClick={() => onNavigate(route)}
        >
          <b>{icons[label]}</b>
          {label === 'Alerts' ? 'Notifications' : label}
          {label === 'Alerts' && unreadCount > 0 ? (
            <span className="dot">{unreadCount}</span>
          ) : null}
        </button>
      ))}
    </nav>
  );
};
