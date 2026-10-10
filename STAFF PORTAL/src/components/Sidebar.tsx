import React from 'react';
import { Pill } from './Pill';

interface SidebarProps {
  deptName: string;
  staff: {
    id: string;
    name: string;
    department: string;
    duty: string;
    availability: string;
  };
  navItems: [string, string][];
  currentPage: string;
  unreadNotes: number;
  isOpen?: boolean;
  onClose?: () => void;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  deptName,
  staff,
  navItems,
  currentPage,
  unreadNotes,
  isOpen = false,
  onClose,
  onNavigate,
  onLogout
}) => {
  const handleItemClick = (name: string) => {
    onNavigate(name);
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="side-backdrop"
          onClick={onClose}
          aria-hidden="true"
          role="presentation"
        />
      )}
      <aside
        className={`side ${isOpen ? 'open' : ''}`}
        aria-label="Staff Navigation"
        aria-hidden={!isOpen && typeof window !== 'undefined' && window.innerWidth <= 960}
      >
        <div className="side-head">
          <div className="brand">
            LEMURIA
            <small>HOTEL OPERATIONS</small>
          </div>
          <button
            type="button"
            className="side-close-btn"
            onClick={onClose}
            aria-label="Close navigation sidebar"
            title="Close navigation (←)"
          >
            ←
          </button>
        </div>
        <div className="dep-pill">
          <span>{deptName}</span>
          <span className={`on-dot ${staff.duty === 'ON' ? '' : 'off'}`}></span>
        </div>

        <nav className="nav">
          {navItems.map(([name, icon]) => (
            <button
              key={name}
              className={currentPage === name ? 'on' : ''}
              onClick={() => handleItemClick(name)}
            >
              <i>{icon}</i>
              <span>{name}</span>
              {name === 'Notifications' && unreadNotes > 0 ? (
                <span className="badge">{unreadNotes}</span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="prof">
          <div className="prof-info">
            <b>{staff.name}</b>
            <br />
            <span className="mu" style={{ fontSize: '11px' }}>
              {staff.id} · {deptName}
            </span>
            <br />
            <div style={{ marginTop: '4px' }}>
              <Pill label={staff.duty === 'ON' ? staff.availability : 'OFF DUTY'} />
            </div>
          </div>
          <button
            className="btn gh sm"
            style={{ width: '100%' }}
            onClick={() => {
              if (onClose) onClose();
              onLogout();
            }}
          >
            ⏻ <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
