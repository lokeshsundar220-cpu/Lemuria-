import React, { useState, useEffect } from 'react';

interface TopBarProps {
  deptName: string;
  hotelName: string;
  duty: string;
  unreadNotes: number;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onOpenNotifications: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  deptName,
  hotelName,
  duty,
  unreadNotes,
  isSidebarOpen = false,
  onToggleSidebar,
  onOpenNotifications
}) => {
  const [timeStr, setTimeStr] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="top">
      {onToggleSidebar && (
        <button
          type="button"
          className="mobile-toggle-btn"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isSidebarOpen}
          title={isSidebarOpen ? 'Close Navigation (←)' : 'Open Navigation (→)'}
        >
          <span className="toggle-icon">{isSidebarOpen ? '←' : '→'}</span>
          <span className="toggle-label">MENU</span>
        </button>
      )}

      <div className="top-title-group">
        <b>{deptName.toUpperCase()} WORKSPACE</b>
        <span className="mu top-hotel-name" style={{ color: '#9eb5ce' }}>
          {hotelName}
        </span>
      </div>
      <span className="sp"></span>
      <span className="row top-duty-indicator" style={{ fontSize: '13px' }}>
        <span className={`on-dot ${duty === 'ON' ? '' : 'off'}`}></span>
        <span className="duty-text">{duty === 'ON' ? 'Duty Active' : 'Off Duty'}</span>
      </span>
      <button className="btn gh sm top-notif-btn" onClick={onOpenNotifications}>
        🔔 {unreadNotes > 0 ? unreadNotes : ''}
      </button>
      <span id="clk" className="top-clock" style={{ fontSize: '13px', fontWeight: 600, color: '#cbd8e8' }}>
        {timeStr}
      </span>
    </div>
  );
};
