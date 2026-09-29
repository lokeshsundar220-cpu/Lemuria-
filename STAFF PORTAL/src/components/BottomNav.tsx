import React from 'react';

interface BottomNavProps {
  navItems: [string, string][];
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ navItems, currentPage, onNavigate }) => {
  return (
    <nav className="bn">
      {navItems.slice(0, 5).map(([name, icon]) => (
        <button
          key={name}
          className={currentPage === name ? 'on' : ''}
          onClick={() => onNavigate(name)}
        >
          <i>{icon}</i>
          {name}
        </button>
      ))}
    </nav>
  );
};
