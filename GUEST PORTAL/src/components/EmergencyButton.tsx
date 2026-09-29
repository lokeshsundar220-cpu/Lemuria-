import React from 'react';

interface EmergencyButtonProps {
  onClick: () => void;
}

export const EmergencyButton: React.FC<EmergencyButtonProps> = ({ onClick }) => {
  return (
    <button className="emg" onClick={onClick}>
      🚨 Emergency assistance
    </button>
  );
};
