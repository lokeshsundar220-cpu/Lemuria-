import React, { useState, useEffect } from 'react';
import { Pill } from './Pill';

interface TaskOfferModalProps {
  task: {
    id: string;
    roomId?: string | null;
    type: string;
    priority: string;
    description: string;
    estimatedDuration: number;
  };
  offer: {
    id: string;
    expiresAt: number;
  };
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const TaskOfferModal: React.FC<TaskOfferModalProps> = ({
  task,
  offer,
  busy,
  onAccept,
  onDecline
}) => {
  const [timeLeft, setTimeLeft] = useState(() =>
    Math.max(0, Math.ceil((offer.expiresAt - Date.now()) / 1000))
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((offer.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 200);
    return () => clearInterval(timer);
  }, [offer.expiresAt]);

  const progressPercent = Math.min(100, Math.max(0, (timeLeft / 15) * 100));

  return (
    <div className="ov">
      <div className="mod offer">
        <div className="gold" style={{ letterSpacing: '3px', fontWeight: 700, fontSize: '12px' }}>
          NEW OPERATIONAL ASSIGNMENT
        </div>
        <h1 className="serif" style={{ margin: '12px 0 6px' }}>
          {task.roomId ? (
            <>
              Room {task.roomId}
              <br />
            </>
          ) : null}
          {task.type}
        </h1>
        <Pill label={`${task.priority} PRIORITY`} />
        <p style={{ color: '#cbd8e8', margin: '12px 0', fontSize: '14px' }}>
          {task.description}
          <br />
          Estimated duration: ~{task.estimatedDuration} minutes
        </p>
        <div className="cd">
          <span>{timeLeft}</span>s
        </div>
        <div className="bar">
          <i style={{ width: `${progressPercent}%` }}></i>
        </div>
        <div className="row" style={{ justifyContent: 'center', marginTop: '16px', gap: '12px' }}>
          <button className="btn gd lg" onClick={onAccept} disabled={busy}>
            {busy ? <span className="spinner"></span> : 'ACCEPT TASK'}
          </button>
          <button className="btn gh lg" onClick={onDecline} disabled={busy}>
            DECLINE
          </button>
        </div>
      </div>
    </div>
  );
};
