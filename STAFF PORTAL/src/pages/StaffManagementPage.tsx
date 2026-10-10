import React, { useState, useEffect } from 'react';
import { Pill } from '../components/Pill';
import * as api from '../services/api';
import type { AttendanceItem } from '../services/api';

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
  const [activeTab, setActiveTab] = useState<'directory' | 'attendance'>('directory');
  const [staffDept, setStaffDept] = useState('ALL');
  const [staffStatus, setStaffStatus] = useState('ALL');
  const [staffSearch, setStaffSearch] = useState('');

  // Attendance history state
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceItem[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attFilterMethod, setAttFilterMethod] = useState('ALL');
  const [attFilterDept, setAttFilterDept] = useState('ALL');

  useEffect(() => {
    if (activeTab === 'attendance') {
      const loadAttendance = async () => {
        setAttLoading(true);
        try {
          const logs = await api.fetchHotelAttendance();
          setAttendanceLogs(logs);
        } catch (err) {
          console.warn('Error loading attendance logs:', err);
        } finally {
          setAttLoading(false);
        }
      };
      loadAttendance();
    }
  }, [activeTab]);

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

  const filteredAttendance = attendanceLogs.filter((a) => {
    if (attFilterDept !== 'ALL' && a.department.toLowerCase() !== attFilterDept.toLowerCase()) return false;
    if (attFilterMethod !== 'ALL' && a.endMethod !== attFilterMethod) return false;
    return true;
  });

  return (
    <>
      <div className="row bt" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="serif">Staff Management & Operations</h1>
          <div className="mu" style={{ fontSize: '13px' }}>
            Administer employee accounts, departments, duty states, and 11:59 PM attendance logs.
          </div>
        </div>
        <button className="btn gd" onClick={onOpenAddStaff}>
          ＋ ADD NEW STAFF
        </button>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar" style={{ marginBottom: '16px' }}>
        <button
          className={`tab-btn ${activeTab === 'directory' ? 'on' : ''}`}
          onClick={() => setActiveTab('directory')}
        >
          👥 Staff Directory ({staffList.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'attendance' ? 'on' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          ⏱ Attendance & 11:59 PM Shift Logs ({attendanceLogs.length})
        </button>
      </div>

      {activeTab === 'directory' ? (
        <>
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
      ) : (
        <>
          {/* Attendance Filter Bar */}
          <div className="card" style={{ marginBottom: '18px', padding: '14px' }}>
            <div className="row bt" style={{ gap: '12px' }}>
              <div className="row" style={{ flex: '1 1 200px', minWidth: 0, width: '100%' }}>
                <select
                  style={{ width: 'auto' }}
                  value={attFilterDept}
                  onChange={(e) => setAttFilterDept(e.target.value)}
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
                  value={attFilterMethod}
                  onChange={(e) => setAttFilterMethod(e.target.value)}
                >
                  <option value="ALL">All Closure Methods</option>
                  <option value="AUTO">🌙 Automatic (11:59 PM Auto-Closed)</option>
                  <option value="MANUAL">👤 Manual (Staff End Duty)</option>
                </select>
              </div>
              <div className="mu" style={{ fontSize: '12px' }}>
                Showing {filteredAttendance.length} attendance session records
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="card tw">
            {attLoading ? (
              <div style={{ padding: '30px', textAlign: 'center' }}>
                <span className="spinner"></span> Loading attendance records…
              </div>
            ) : filteredAttendance.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Department</th>
                    <th>Work Date</th>
                    <th>Shift Start</th>
                    <th>Shift End</th>
                    <th>Closure Method</th>
                    <th>Status</th>
                    <th>Reason / Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <b>{a.staffName || a.staffCode}</b>
                        <div className="mu" style={{ fontSize: '11px' }}>
                          {a.staffCode || (typeof a.staffId === 'object' ? a.staffId.staffCode : String(a.staffId))}
                        </div>
                      </td>
                      <td>
                        <span className="pill no-dot" style={{ '--c': 'var(--bl)' } as React.CSSProperties}>
                          {deptMap[a.department.toLowerCase()] || a.department}
                        </span>
                      </td>
                      <td>
                        <b>{a.workDate}</b>
                      </td>
                      <td>
                        {a.startedAt ? new Date(a.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td>
                        {a.endedAt ? new Date(a.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span className="mu">In Progress</span>}
                      </td>
                      <td>
                        {a.endMethod === 'AUTO' ? (
                          <span
                            className="pill"
                            style={{
                              background: 'rgba(212, 175, 55, 0.18)',
                              color: 'var(--gd)',
                              border: '1px solid rgba(212, 175, 55, 0.4)'
                            }}
                          >
                            🌙 AUTO (11:59 PM)
                          </span>
                        ) : a.endMethod === 'MANUAL' ? (
                          <span className="pill" style={{ '--c': 'var(--g)' } as React.CSSProperties}>
                            👤 MANUAL
                          </span>
                        ) : (
                          <span className="mu">—</span>
                        )}
                      </td>
                      <td>
                        <Pill label={a.status} />
                      </td>
                      <td>
                        <span className="mu" style={{ fontSize: '11.5px' }}>
                          {a.closureReason || (a.status === 'ACTIVE' ? 'Active Shift' : 'Completed')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty">
                <div style={{ fontSize: '26px', color: 'var(--gd)' }}>⏱</div>
                <b>NO ATTENDANCE RECORDS FOUND</b>
                <div className="mu" style={{ fontSize: '13px', marginTop: '4px' }}>
                  Staff shift attendance sessions and 11:59 PM auto-closure logs will appear here.
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};
