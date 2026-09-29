import React from 'react';
import { Pill } from '../components/Pill';

interface TasksPageProps {
  tasks: {
    id: string;
    department: string;
    type: string;
    roomId?: string | null;
    priority: string;
    status: string;
    offerStatus: string;
    assignedStaffId: string | null;
    createdAt: number;
  }[];
  deptMap: Record<string, string>;
  userDept: string;
  onTaskClick: (id: string) => void;
}

const fmt = (t: number | null | undefined) =>
  t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

export const TasksPage: React.FC<TasksPageProps> = ({
  tasks,
  deptMap,
  userDept,
  onTaskClick
}) => {
  const isDisp = ['housekeeping', 'maintenance', 'fnb'].includes(userDept);
  const displayTasks = isDisp ? tasks.filter((t) => t.department === userDept) : tasks;

  return (
    <>
      <h1 className="serif" style={{ marginBottom: '16px' }}>
        Task Operations Directory
      </h1>
      <div className="card tw">
        {displayTasks.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Room</th>
                <th>Task Type</th>
                <th>Department</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned Staff</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {displayTasks.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => onTaskClick(t.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <b>{t.id}</b>
                  </td>
                  <td>{t.roomId ? `Room ${t.roomId}` : 'General'}</td>
                  <td>{t.type}</td>
                  <td>{deptMap[t.department]}</td>
                  <td>
                    <Pill label={t.priority} />
                  </td>
                  <td>
                    <Pill
                      label={
                        t.status === 'PENDING' && t.offerStatus === 'OFFERED'
                          ? 'OFFERING'
                          : t.status
                      }
                    />
                  </td>
                  <td>{t.assignedStaffId || <span className="mu">Unassigned</span>}</td>
                  <td>{fmt(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">
            <div style={{ fontSize: '26px', color: 'var(--gd)' }}>◈</div>
            <b>NO TASKS IN QUEUE</b>
            <div className="mu" style={{ fontSize: '13px', marginTop: '4px' }}>
              Dispatched tasks will appear here in real-time.
            </div>
          </div>
        )}
      </div>
    </>
  );
};
