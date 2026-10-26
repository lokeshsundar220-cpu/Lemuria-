import React, { useState } from 'react';
import { Pill } from './Pill';

interface DeleteTaskModalProps {
  task: {
    id: string;
    _id?: string;
    roomId?: string | null;
    roomNumber?: string;
    type: string;
    department?: string;
    priority?: string;
    status: string;
    offerStatus?: string;
  };
  busy: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export const DeleteTaskModal: React.FC<DeleteTaskModalProps> = ({
  task,
  busy,
  onConfirm,
  onClose
}) => {
  const [reason, setReason] = useState('');

  const isActiveOrOffered =
    task.status === 'OFFERED' ||
    task.status === 'ACCEPTED' ||
    task.status === 'IN PROGRESS' ||
    task.status === 'IN_PROGRESS' ||
    task.offerStatus === 'OFFERED';

  const roomDisplay = task.roomNumber || task.roomId || 'General Area';

  return (
    <div className="ov" id="delete-task-overlay" style={{ zIndex: 120 }}>
      <div className="mod" id="delete-task-modal" style={{ maxWidth: '480px' }}>
        <div className="row bt" style={{ marginBottom: '12px' }}>
          <h2 style={{ color: 'var(--r)', margin: 0 }}>Delete Task Confirmation</h2>
          <Pill label={task.status} />
        </div>

        <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#c0d3e8', lineHeight: 1.5 }}>
          Are you sure you want to delete this task? This action performs an audited soft-deletion,
          removing the task from active dispatch while preserving hotel records.
        </p>

        {isActiveOrOffered ? (
          <div
            style={{
              background: 'rgba(235, 87, 87, 0.15)',
              border: '1px solid rgba(235, 87, 87, 0.5)',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '16px',
              color: '#ff8a8a',
              fontSize: '13px',
              lineHeight: 1.45
            }}
          >
            <b>⚠ Warning: In-Progress / Offered Task</b>
            <div style={{ marginTop: '4px' }}>
              This task is currently active or offered to a staff member. Deleting it will safely cancel
              outstanding offers, revoke dispatch timers, and restore assigned staff availability.
            </div>
          </div>
        ) : null}

        <div
          style={{
            background: 'rgba(5, 18, 33, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '16px',
            fontSize: '13.5px',
            lineHeight: 1.6
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: 'var(--mu)' }}>Task ID:</span>
            <b>{task.id || task._id}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: 'var(--mu)' }}>Room:</span>
            <b>{roomDisplay}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: 'var(--mu)' }}>Task Type:</span>
            <b>{task.type}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--mu)' }}>Current Status:</span>
            <b style={{ color: 'var(--gd)' }}>{task.status}</b>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: 'var(--mu)', marginBottom: '6px' }}>
            Reason for Deletion (recorded in audit log):
          </label>
          <input
            type="text"
            className="inp"
            style={{ width: '100%' }}
            placeholder="e.g., Duplicate request, guest checked out early, error"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={busy}
          />
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn gh" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="btn rd"
            onClick={() => onConfirm(reason)}
            disabled={busy}
            id="btn-confirm-delete-task"
          >
            {busy ? <span className="spinner"></span> : null}
            DELETE TASK
          </button>
        </div>
      </div>
    </div>
  );
};
