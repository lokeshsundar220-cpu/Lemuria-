import React, { useState, useEffect } from 'react';
import { Pill } from './Pill';

interface TaskOfferModalProps {
  task: {
    id: string;
    roomId?: string | null;
    roomNumber?: string;
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
  onTimeout?: () => void;
}

export const TaskOfferModal: React.FC<TaskOfferModalProps> = ({
  task,
  offer,
  busy,
  onAccept,
  onDecline,
  onTimeout
}) => {
  const [timeLeft, setTimeLeft] = useState(() =>
    Math.max(0, Math.ceil((offer.expiresAt - Date.now()) / 1000))
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((offer.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        if (onTimeout) {
          onTimeout();
        }
      }
    }, 200);
    return () => clearInterval(timer);
  }, [offer.expiresAt, onTimeout]);

  const progressPercent = Math.min(100, Math.max(0, (timeLeft / 15) * 100));
  const roomDisplay = task.roomNumber || task.roomId;

  return (
    <div className="ov" id="task-offer-overlay">
      <div className="mod offer" id="task-offer-modal" style={{ maxWidth: '480px' }}>
        <div className="gold" style={{ letterSpacing: '3px', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>
          TASK OFFER
        </div>
        <h1 className="serif" style={{ margin: '10px 0 6px', fontSize: '22px' }}>
          {roomDisplay ? `Room ${roomDisplay} · ` : ''}{task.type}
        </h1>
        <div style={{ margin: '6px 0' }}>
          <Pill label={`${task.priority || 'MEDIUM'} PRIORITY`} />
        </div>

        <div
          style={{
            textAlign: 'left',
            background: 'rgba(5, 18, 33, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '14px 16px',
            margin: '14px 0 8px',
            fontSize: '13.5px',
            lineHeight: 1.6
          }}
        >
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: 'var(--mu)', fontWeight: 600 }}>Room:</span>{' '}
            <b style={{ color: '#fff' }}>{roomDisplay ? `Room ${roomDisplay}` : 'General Hotel Area'}</b>
          </div>
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: 'var(--mu)', fontWeight: 600 }}>Task:</span>{' '}
            <b style={{ color: '#fff' }}>{task.type}</b>
          </div>
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: 'var(--mu)', fontWeight: 600 }}>Priority:</span>{' '}
            <b style={{ color: 'var(--gd)' }}>{task.priority || 'MEDIUM'}</b>
          </div>
          <div>
            <span style={{ color: 'var(--mu)', fontWeight: 600 }}>Description:</span>{' '}
            <span style={{ color: '#cbd8e8' }}>{task.description || 'New operational task assignment awaiting your response.'}</span>
          </div>
        </div>

        <div style={{ color: '#9eb5ce', fontSize: '12px', margin: '4px 0' }}>
          Estimated duration: ~{task.estimatedDuration || 30} minutes
        </div>

        <div className="cd" style={{ margin: '6px 0' }}>
          <span>{timeLeft}</span>s
        </div>
        <div className="bar">
          <i style={{ width: `${progressPercent}%` }}></i>
        </div>
        <div className="row" style={{ justifyContent: 'center', marginTop: '16px', gap: '14px' }}>
          <button
            className="btn gd lg"
            onClick={onAccept}
            disabled={busy || timeLeft <= 0}
            id="btn-accept-task-offer"
            style={{ minWidth: '130px', fontWeight: 700 }}
          >
            {busy ? <span className="spinner"></span> : 'ACCEPT'}
          </button>
          <button
            className="btn gh lg"
            onClick={onDecline}
            disabled={busy}
            id="btn-decline-task-offer"
            style={{ minWidth: '130px' }}
          >
            DECLINE
          </button>
        </div>
      </div>
    </div>
  );
};
