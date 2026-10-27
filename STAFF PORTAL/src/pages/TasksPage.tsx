import React, { useState } from 'react';
import { Pill } from '../components/Pill';

interface TasksPageProps {
  tasks: {
    id: string;
    _id?: string;
    department: string;
    type: string;
    roomId?: string | null;
    roomNumber?: string;
    priority: string;
    status: string;
    offerStatus: string;
    assignedStaffId: string | null;
    assignedStaffName?: string;
    createdAt: number;
    startedAt?: number | null;
    completedAt?: number | null;
    isDeleted?: boolean;
    description?: string;
  }[];
  deptMap: Record<string, string>;
  userDept: string;
  onTaskClick: (id: string) => void;
  onDeleteTask?: (task: any) => void;
}

const fmt = (t: number | null | undefined) =>
  t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

const fmtFull = (t: number | null | undefined) =>
  t
    ? new Date(t).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '—';

export const TasksPage: React.FC<TasksPageProps> = ({
  tasks,
  deptMap,
  userDept,
  onTaskClick,
  onDeleteTask
}) => {
  const normalizedDept = (userDept || '').toLowerCase();
  const isDisp = ['housekeeping', 'maintenance', 'fnb'].includes(normalizedDept);
  const isManager = normalizedDept === 'manager';

  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [selectedDept, setSelectedDept] = useState<string>('all');

  const { activeList, historyList, currentList } = React.useMemo(() => {
    const baseTasks = isDisp
      ? tasks.filter((t) => (t.department || '').toLowerCase() === normalizedDept)
      : tasks;
    const nonDeleted = baseTasks.filter((t) => !t.isDeleted && t.status !== 'DELETED');
    const deptFiltered =
      selectedDept === 'all'
        ? nonDeleted
        : nonDeleted.filter((t) => (t.department || '').toLowerCase() === selectedDept.toLowerCase());

    const active = deptFiltered.filter((t) => t.status !== 'COMPLETED');
    const history = deptFiltered.filter((t) => t.status === 'COMPLETED');
    const current = activeTab === 'active' ? active : history;

    return { activeList: active, historyList: history, currentList: current };
  }, [tasks, isDisp, normalizedDept, selectedDept, activeTab]);

  const getDuration = (t: typeof tasks[0]) => {
    if (!t.completedAt) return '—';
    const start = t.startedAt || t.createdAt;
    if (!start) return '—';
    const diffMin = Math.max(1, Math.round((t.completedAt - start) / 60000));
    return `${diffMin} min`;
  };

  return (
    <>
      <div className="row bt" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="serif" style={{ margin: 0 }}>
            {activeTab === 'active' ? 'Active Task Operations' : 'Completed Task History'}
          </h1>
          <div className="mu" style={{ fontSize: '13px', marginTop: '4px' }}>
            {activeTab === 'active'
              ? 'Real-time task queue, dispatched assignments, and active work orders'
              : 'Permanent audit history of completed housekeeping and maintenance tasks'}
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="row" style={{ gap: '8px' }}>
          <button
            className={`btn sm ${activeTab === 'active' ? '' : 'gh'}`}
            onClick={() => setActiveTab('active')}
          >
            ACTIVE TASKS ({activeList.length})
          </button>
          <button
            className={`btn sm ${activeTab === 'history' ? '' : 'gh'}`}
            onClick={() => setActiveTab('history')}
          >
            TASK HISTORY ({historyList.length})
          </button>
        </div>
      </div>

      {/* Manager Department Filters */}
      {isManager ? (
        <div className="row" style={{ gap: '6px', marginBottom: '14px' }}>
          <button
            className={`btn sm ${selectedDept === 'all' ? 'gd' : 'gh'}`}
            onClick={() => setSelectedDept('all')}
          >
            ALL DEPARTMENTS
          </button>
          {['housekeeping', 'maintenance', 'fnb'].map((d) => (
            <button
              key={d}
              className={`btn sm ${selectedDept === d ? 'gd' : 'gh'}`}
              onClick={() => setSelectedDept(d)}
            >
              {deptMap[d] || d.toUpperCase()}
            </button>
          ))}
        </div>
      ) : null}

      <div className="card tw">
        {currentList.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Task Code</th>
                <th>Room</th>
                <th>Task Type</th>
                <th>Department</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned Staff</th>
                <th>Created</th>
                {activeTab === 'history' ? (
                  <>
                    <th>Completed At</th>
                    <th>Duration</th>
                  </>
                ) : null}
                {isManager && onDeleteTask ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {currentList.map((t) => {
                const roomDisplay = t.roomNumber || t.roomId;
                return (
                  <tr
                    key={t.id}
                    onClick={() => onTaskClick(t.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <b className="gold">{t.id}</b>
                    </td>
                    <td>{roomDisplay ? `Room ${roomDisplay}` : 'General Area'}</td>
                    <td>{t.type}</td>
                    <td>{deptMap[t.department] || t.department}</td>
                    <td>
                      <Pill label={t.priority} />
                    </td>
                    <td>
                      <Pill
                        label={
                          t.status === 'ACCEPTED'
                            ? 'ACCEPTED'
                            : t.status === 'IN PROGRESS' || t.status === 'IN_PROGRESS'
                            ? 'IN PROGRESS'
                            : t.status === 'COMPLETED'
                            ? 'COMPLETED'
                            : 'PENDING'
                        }
                      />
                    </td>
                    <td>{t.assignedStaffName || t.assignedStaffId || <span className="mu">Unassigned</span>}</td>
                    <td>{fmt(t.createdAt)}</td>
                    {activeTab === 'history' ? (
                      <>
                        <td>{fmtFull(t.completedAt)}</td>
                        <td style={{ color: 'var(--g)', fontWeight: 600 }}>{getDuration(t)}</td>
                      </>
                    ) : null}
                    {isManager && onDeleteTask ? (
                      <td>
                        <button
                          className="btn sm rd"
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTask(t);
                          }}
                        >
                          DELETE
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty">
            <div style={{ fontSize: '26px', color: 'var(--gd)' }}>◈</div>
            <b>{activeTab === 'active' ? 'NO ACTIVE TASKS IN QUEUE' : 'NO COMPLETED TASKS IN HISTORY'}</b>
            <div className="mu" style={{ fontSize: '13px', marginTop: '4px' }}>
              {activeTab === 'active'
                ? 'Dispatched tasks will appear here in real-time.'
                : 'Completed housekeeping and maintenance tasks will remain visible here.'}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
