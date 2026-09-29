import React, { useState, useEffect } from 'react';

interface TopBarProps {
  deptName: string;
  hotelName: string;
  duty: string;
  unreadNotes: number;
  onOpenNotifications: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  deptName,
  hotelName,
  duty,
  unreadNotes,
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
      <b>{deptName.toUpperCase()} WORKSPACE</b>
      <span className="mu" style={{ color: '#9eb5ce' }}>
        {hotelName}
      </span>
      <span className="sp"></span>
      <span className="row" style={{ fontSize: '13px' }}>
        <span className={`on-dot ${duty === 'ON' ? '' : 'off'}`}></span>
        {duty === 'ON' ? 'Duty Active' : 'Off Duty'}
      </span>
      <button className="btn gh sm" onClick={onOpenNotifications}>
        🔔 {unreadNotes > 0 ? unreadNotes : ''}
      </button>
      <span id="clk" style={{ fontSize: '13px', fontWeight: 600, color: '#cbd8e8' }}>
        {timeStr}
      </span>
    </div>
  );
};
