import React from 'react';

interface PillProps {
  label: string;
  noDot?: boolean;
  colorVar?: string;
  className?: string;
}

const COLOR_MAP: Record<string, string> = {
  AVAILABLE: '--g',
  READY: '--g',
  COMPLETED: '--g',
  ENABLED: '--g',
  ON: '--g',
  'ON DUTY': '--g',
  'CHECKED IN': '--g',
  PENDING: '--o',
  OFFERING: '--o',
  EXPECTED: '--o',
  SUSPENDED: '--o',
  HIGH: '--o',
  CHECKOUT: '--o',
  'AWAITING VERIFICATION': '--o',
  BUSY: '--bl',
  'IN PROGRESS': '--bl',
  OCCUPIED: '--ln',
  ACCEPTED: '--cy',
  CLEANING: '--cy',
  'INSPECTION REQUIRED': '--pu',
  EMERGENCY: '--r',
  URGENT: '--r',
  DISABLED: '--r',
  DELETED: '--mu',
  NORMAL: '--ln',
  LOW: '--mu',
  'OFF DUTY': '--mu',
  OFF: '--mu',
  'SYSTEM ONLINE': '--g',
  VERIFIED: '--g',
  'DISPATCH ACTIVE · Auto-offers enabled': '--g',
  'HOUSEKEEPING': '--bl',
  'MAINTENANCE': '--bl',
  'FOOD & BEVERAGE': '--bl',
  'RECEPTION': '--bl',
  'MANAGER': '--bl'
};

export const Pill: React.FC<PillProps> = ({ label, noDot, colorVar, className = '' }) => {
  const c = colorVar || COLOR_MAP[label] || '--mu';
  return (
    <span
      className={`pill ${noDot ? 'no-dot' : ''} ${className}`}
      style={{ '--c': `var(${c})` } as React.CSSProperties}
    >
      {label}
    </span>
  );
};
