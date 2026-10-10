import React, { useState } from 'react';
import { Pill } from '../components/Pill';

interface StaffManagementPageProps {
  staffList: {
    id: string;
    name: string;
    email: string;
    department: string;
    enabled: string;
    duty: string;
    availability: string;
    currentTaskId: string | null;
  }[];
  tasks: {
    assignedStaffId: string | null;
    status: string;
  }[];
  deptMap: Record<string, string>;
  onOpenAddStaff: () => void;
  onOpenEditStaff: (id: string) => void;
  onSetStaffStatus: (id: string, status: string) => void;
}

export const StaffManagementPage: React.FC<StaffManagementPageProps> = ({
  staffList,
  tasks,
  deptMap,
  onOpenAddStaff,
  onOpenEditStaff,
  onSetStaffStatus
}) => {
  const [staffDept, setStaffDept] = useState('ALL');
  const [staffStatus, setStaffStatus] = useState('ALL');
  const [staffSearch, setStaffSearch] = useState('');

  const q = staffSearch.toLowerCase();
  const filtered = staffList.filter((s) => {
    if (staffDept !== 'ALL' && s.department !== staffDept) return false;
    if (staffStatus !== 'ALL' && s.enabled !== staffStatus) return false;
    if (
      q &&
      !s.name.toLowerCase().includes(q) &&
      !s.id.toLowerCase().includes(q) &&
      !s.email.toLowerCase().includes(q)
    )
      return false;
    return true;
  });

  return (
    <>
      <div className="row bt" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="serif">Staff Management</h1>
          <div className="mu" style={{ fontSize: '13px' }}>
            Administer employee accounts, departments, permissions, and duty states.
          </div>
        </div>
        <button className="btn gd" onClick={onOpenAddStaff}>
          ＋ ADD NEW STAFF
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '18px', padding: '14px' }}>
        <div className="row bt" style={{ gap: '12px' }}>
          <div className="row" style={{ flex: '1 1 200px', minWidth: 0, width: '100%' }}>
            <input
              type="text"
              placeholder="Search by name, ID, or email…"
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              style={{ flex: '1 1 180px', minWidth: 0 }}
            />
            <select
              style={{ width: 'auto' }}
              value={staffDept}
              onChange={(e) => setStaffDept(e.target.value)}
            >
              <option value="ALL">All Departments</option>
              <option value="reception">Reception</option>
              <option value="housekeeping">Housekeeping</option>
              <option value="maintenance">Maintenance</option>
              <option value="fnb">Food & Beverage</option>
              <option value="manager">Manager</option>
            </select>
            <select
              style={{ width: 'auto' }}
              value={staffStatus}
              onChange={(e) => setStaffStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ENABLED">Enabled (Active)</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DISABLED">Disabled</option>
              <option value="DELETED">Deleted</option>
            </select>
          </div>
          <div className="mu" style={{ fontSize: '12px' }}>
            Showing {filtered.length} of {staffList.length} staff records
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="card tw">
        <table>
          <thead>
            <tr>
              <th>Staff ID & Name</th>
              <th>Department</th>
              <th>Account Status</th>
              <th>Duty Status</th>
              <th>Availability</th>
              <th>Workload Today</th>
              <th>Active Task</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const completedToday = tasks.filter(
                (t) => t.assignedStaffId === s.id && t.status === 'COMPLETED'
              ).length;

              return (
                <tr key={s.id}>
                  <td>
                    <b>{s.name}</b>
                    <div className="mu" style={{ fontSize: '11px' }}>
                      {s.id} · {s.email}
                    </div>
                  </td>
                  <td>
                    <span className="pill no-dot" style={{ '--c': 'var(--bl)' } as React.CSSProperties}>
                      {deptMap[s.department]}
                    </span>
                  </td>
                  <td>
                    <Pill label={s.enabled} />
                  </td>
                  <td>
                    <Pill label={s.duty === 'ON' ? 'ON DUTY' : 'OFF DUTY'} />
                  </td>
                  <td>{s.duty === 'ON' ? <Pill label={s.availability} /> : <span className="mu">—</span>}</td>
                  <td>
                    <b style={{ color: 'var(--tx)' }}>{completedToday}</b>{' '}
                    <span className="mu">done</span>
                  </td>
                  <td>
                    {s.currentTaskId ? (
                      <span className="pill" style={{ '--c': 'var(--bl)' } as React.CSSProperties}>
                        {s.currentTaskId}
                      </span>
                    ) : (
                      <span className="mu">None</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="row" style={{ justifyContent: 'flex-end', gap: '4px' }}>
                      <button className="btn sm gh" onClick={() => onOpenEditStaff(s.id)}>
                        Edit
                      </button>
                      {s.enabled === 'ENABLED' ? (
                        <>
                          <button
                            className="btn sm gh"
                            style={{ color: 'var(--o)' }}
                            onClick={() => onSetStaffStatus(s.id, 'SUSPENDED')}
                          >
                            Suspend
                          </button>
                          <button
                            className="btn sm gh"
                            style={{ color: 'var(--r)' }}
                            onClick={() => onSetStaffStatus(s.id, 'DISABLED')}
                          >
                            Disable
                          </button>
                        </>
                      ) : s.enabled === 'SUSPENDED' ? (
                        <>
                          <button
                            className="btn sm gh"
                            style={{ color: 'var(--g)' }}
                            onClick={() => onSetStaffStatus(s.id, 'ENABLED')}
                          >
                            Reactivate
                          </button>
                          <button
                            className="btn sm gh"
                            style={{ color: 'var(--r)' }}
                            onClick={() => onSetStaffStatus(s.id, 'DELETED')}
                          >
                            Delete
                          </button>
                        </>
                      ) : s.enabled === 'DISABLED' ? (
                        <>
                          <button
                            className="btn sm gh"
                            style={{ color: 'var(--g)' }}
                            onClick={() => onSetStaffStatus(s.id, 'ENABLED')}
                          >
                            Enable
                          </button>
                          <button
                            className="btn sm gh"
                            style={{ color: 'var(--r)' }}
                            onClick={() => onSetStaffStatus(s.id, 'DELETED')}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn sm gh"
                          style={{ color: 'var(--g)' }}
                          onClick={() => onSetStaffStatus(s.id, 'ENABLED')}
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};
