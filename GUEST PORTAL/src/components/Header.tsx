import React from 'react';

interface HeaderProps {
  user: { id: string; name: string } | null;
  isCheckedIn: boolean;
  unreadCount: number;
  currentRoute: string;
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isCheckedIn,
  unreadCount,
  currentRoute,
  onNavigate,
  onLogout
}) => {
  const links = user
    ? [
        ['dashboard', 'Home'],
        [isCheckedIn ? 'stay' : 'my-bookings', isCheckedIn ? 'Stay' : 'Bookings'],
        ['services', 'Services'],
        ['notifications', 'Alerts'],
        ['profile', 'Profile']
      ]
    : [
        ['home', 'Home'],
        ['hotels', 'Hotels']
      ];

  const isActive = (route: string) => currentRoute === route || currentRoute.startsWith(`${route}/`);

  return (
    <header className="top">
      <a
        className="brand"
        onClick={() => onNavigate(user ? 'dashboard' : 'home')}
      >
        LEMURIA
      </a>
      <nav>
        {links.map(([route, label]) => (
          <button
            key={route}
            className={isActive(route) ? 'on' : ''}
            onClick={() => onNavigate(route)}
          >
            {label}
            {label === 'Alerts' && unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
        ))}
      </nav>
      <div className="hr">
        {user ? (
          <button className="btn sm ghost" style={{ color: '#fff' }} onClick={onLogout}>
            Sign out
          </button>
        ) : (
          <>
            <button
              className="btn sm ghost"
              style={{ color: '#fff' }}
              onClick={() => onNavigate('login')}
            >
              Sign in
            </button>
            <button
              className="btn sm gold"
              onClick={() => onNavigate('register')}
            >
              Create account
            </button>
          </>
        )}
      </div>
    </header>
  );
};
