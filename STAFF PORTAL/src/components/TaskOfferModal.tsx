import React, { useState, useEffect } from 'react';
import { Pill } from './Pill';

interface TaskOfferModalProps {
  task: {
    id: string;
    roomId?: string | null;
    roomNumber?: string;
    department?: string;
    type: string;
    priority: string;
    description: string;
    guestRequest?: string;
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

  const onTimeoutRef = React.useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((offer.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        if (onTimeoutRef.current) {
          onTimeoutRef.current();
        }
      }
    }, 250);
    return () => clearInterval(timer);
  }, [offer.expiresAt]);

  const progressPercent = Math.min(100, Math.max(0, (timeLeft / 15) * 100));
  const roomDisplay = task.roomNumber || task.roomId;
  const deptDisplay = (task.department || 'OPERATIONS').toUpperCase();

  return (
    <div className="ov" id="task-offer-overlay" style={{ zIndex: 100 }}>
      <div className="mod offer" id="task-offer-modal" style={{ maxWidth: '480px', zIndex: 101 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '20px' }}>🔔</span>
          <span className="gold" style={{ letterSpacing: '2px', fontWeight: 800, fontSize: '15px', textTransform: 'uppercase' }}>
            NEW TASK OFFER
          </span>
        </div>

        <h1 className="serif" style={{ margin: '8px 0 6px', fontSize: '22px', textAlign: 'center' }}>
          {deptDisplay}
        </h1>
        <div style={{ textAlign: 'center', margin: '4px 0 12px' }}>
          <Pill label={`${task.priority || 'HIGH'} PRIORITY`} />
        </div>

        <div
          style={{
            textAlign: 'left',
            background: 'rgba(5, 18, 33, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '16px 18px',
            margin: '10px 0 12px',
            fontSize: '14px',
            lineHeight: 1.6
          }}
        >
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--mu)', fontWeight: 600 }}>Room:</span>
            <b style={{ color: '#fff', fontSize: '15px' }}>{roomDisplay ? `Room ${roomDisplay}` : 'General Hotel Area'}</b>
          </div>
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--mu)', fontWeight: 600 }}>Request:</span>
            <b style={{ color: '#fff' }}>{task.description || task.guestRequest || task.type}</b>
          </div>
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--mu)', fontWeight: 600 }}>Priority:</span>
            <b style={{ color: 'var(--gd)' }}>{task.priority || 'HIGH'}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--mu)', fontWeight: 600 }}>Duration:</span>
            <span style={{ color: '#cbd8e8' }}>~{task.estimatedDuration || 30} mins</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', color: '#ffb347', fontWeight: 600, fontSize: '14px', margin: '8px 0 4px' }}>
          Offer expires in: <b>{timeLeft}</b> seconds
        </div>

        <div className="bar" style={{ height: '6px', margin: '8px 0 16px' }}>
          <i style={{ width: `${progressPercent}%`, transition: 'width 0.2s linear' }}></i>
        </div>

        <div className="row" style={{ justifyContent: 'center', gap: '10px' }}>
          <button
            className="btn gh lg"
            onClick={onDecline}
            disabled={busy}
            id="btn-decline-task-offer"
            style={{ flex: '1 1 110px', minWidth: 0, maxWidth: '180px', fontWeight: 600 }}
          >
            DECLINE
          </button>
          <button
            className="btn gd lg"
            onClick={onAccept}
            disabled={busy || timeLeft <= 0}
            id="btn-accept-task-offer"
            style={{ flex: '1 1 130px', minWidth: 0, maxWidth: '200px', fontWeight: 700 }}
          >
            {busy ? <span className="spinner"></span> : 'ACCEPT TASK'}
          </button>
        </div>
      </div>
    </div>
  );
};
