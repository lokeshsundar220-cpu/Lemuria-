import React from 'react';
import { Pill } from './Pill';

interface TaskDetailModalProps {
  id: string;
  task?: {
    id: string;
    roomId?: string | null;
    type: string;
    department: string;
    priority: string;
    description: string;
    guestRequest: string;
    status: string;
    offerStatus: string;
    assignedStaffId: string | null;
    createdAt: number;
    acceptedAt: number | null;
    estimatedDuration: number;
  };
  emergency?: {
    id: string;
    room: string;
    text: string;
    at: number;
  };
  isMine: boolean;
  onClose: () => void;
  onStartTask: (id: string) => void;
  onOpenComplete: (id: string) => void;
}

const fmt = (t: number | null | undefined) =>
  t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDate = (t: number | null | undefined) =>
  t
    ? new Date(t).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '—';

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  id,
  task,
  emergency,
  isMine,
  onClose,
  onStartTask,
  onOpenComplete
}) => {
  if (id.startsWith('E:') && emergency) {
    return (
      <div className="ov">
        <div className="mod">
          <h2 style={{ color: 'var(--r)' }}>Emergency · Room {emergency.room}</h2>
          <p style={{ margin: '12px 0', fontSize: '15px' }}>{emergency.text}</p>
          <p className="mu">Raised at {fmtDate(emergency.at)}</p>
          <div className="row" style={{ marginTop: '16px', justifyContent: 'flex-end' }}>
            <button className="btn gh" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!task) return null;

  const steps = ['PENDING', 'OFFERED', 'ACCEPTED', 'IN PROGRESS', 'COMPLETED'];
  const curIndex =
    task.status === 'PENDING'
      ? task.offerStatus === 'OFFERED'
        ? 1
        : 0
      : steps.indexOf(task.status);

  return (
    <div className="ov">
      <div className="mod">
        <div className="row bt">
          <h2>
            {task.roomId ? `Room ${task.roomId} · ` : ''}
            {task.type}
          </h2>
          <Pill label={task.priority} />
        </div>
        <div className="steps">
          {steps.map((s, i) => (
            <div key={s} className={i <= curIndex ? 'd' : ''}>
              {s}
            </div>
          ))}
        </div>
        <div className="grid g2" style={{ gap: '10px', margin: '14px 0' }}>
          <div>
            <span className="mu">Description</span>
            <br />
            <b>{task.description}</b>
          </div>
          <div>
            <span className="mu">Guest Request</span>
            <br />
            <b>{task.guestRequest}</b>
          </div>
          <div>
            <span className="mu">Created</span>
            <br />
            {fmt(task.createdAt)}
          </div>
          <div>
            <span className="mu">Accepted</span>
            <br />
            {fmt(task.acceptedAt)}
          </div>
          <div>
            <span className="mu">Estimated Duration</span>
            <br />
            {task.estimatedDuration} min
          </div>
          <div>
            <span className="mu">Assigned Staff</span>
            <br />
            <b>{task.assignedStaffId || 'Unassigned'}</b>
          </div>
        </div>
        <div className="row" style={{ marginTop: '18px', justifyContent: 'flex-end' }}>
          <button className="btn gh" onClick={onClose}>
            Close
          </button>
          {isMine && task.status === 'ACCEPTED' ? (
            <button
              className="btn"
              onClick={() => {
                onStartTask(task.id);
                onClose();
              }}
            >
              START TASK
            </button>
          ) : null}
          {isMine && task.status === 'IN PROGRESS' ? (
            <button className="btn" onClick={() => onOpenComplete(task.id)}>
              COMPLETE TASK
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
