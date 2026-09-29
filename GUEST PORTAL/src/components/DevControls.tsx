import React from 'react';

interface DevControlsProps {
  onCheckIn: () => void;
  onAdvanceRequest: () => void;
  onCheckOut: () => void;
  onResetStay: () => void;
}

export const DevControls: React.FC<DevControlsProps> = ({
  onCheckIn,
  onAdvanceRequest,
  onCheckOut,
  onResetStay
}) => {
  return (
    <details className="dev">
      <summary>Demo controls</summary>
      <div>
        <span className="mute">
          Stands in for reception/staff apps. Remove when the real backend is connected.
        </span>
        <button className="btn sm" onClick={onCheckIn}>
          Reception: check in
        </button>
        <button className="btn sm" onClick={onAdvanceRequest}>
          Staff: advance request
        </button>
        <button className="btn sm" onClick={onCheckOut}>
          Reception: check out
        </button>
        <button
          className="btn sm ghost"
          style={{ color: 'var(--red)' }}
          onClick={onResetStay}
        >
          Reset stay
        </button>
      </div>
    </details>
  );
};
