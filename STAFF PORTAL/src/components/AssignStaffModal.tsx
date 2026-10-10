import React, { useState } from 'react';
import { Pill } from './Pill';

interface AssignStaffModalProps {
  task: {
    id: string;
    _id?: string;
    roomId?: string | null;
    roomNumber?: string;
    type: string;
    department: string;
    priority: string;
    description: string;
    guestRequest?: string;
    estimatedDuration?: number;
  };
  allStaff: {
    id: string;
    _id?: string;
    staffCode?: string;
    staffId?: string;
    name: string;
    fullName?: string;
    department: string;
    duty: string;
    dutyStatus?: string;
    availability: string;
    enabled: string | boolean;
  }[];
  deptMap: Record<string, string>;
  busy: boolean;
  onClose: () => void;
  onAssign: (taskId: string, staffId: string) => void;
}

export const AssignStaffModal: React.FC<AssignStaffModalProps> = ({
  task,
  allStaff,
  deptMap,
  busy,
  onClose,
  onAssign
}) => {
  const taskDept = (task.department || '').toLowerCase();
  const deptStaff = allStaff.filter(
    (s) => (s.department || '').toLowerCase() === taskDept
  );

  const [selectedStaffId, setSelectedStaffId] = useState<string>(() => {
    const firstEligible = deptStaff.find(
      (s) =>
        (s.duty === 'ON' || s.duty === 'ON_DUTY' || s.dutyStatus === 'ON_DUTY') &&
        (s.availability === 'AVAILABLE' || s.availability === 'available') &&
        s.enabled !== false &&
        s.enabled !== 'DISABLED' &&
        s.enabled !== 'DELETED'
    );
    return firstEligible ? (firstEligible._id || firstEligible.id) : '';
  });

  const roomDisplay = task.roomNumber || task.roomId;

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;
    onAssign(task._id || task.id || '', selectedStaffId);
  };

  return (
    <div className="ov" id="assign-staff-overlay">
      <div className="mod" id="assign-staff-modal" style={{ maxWidth: '540px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '20px' }}>📋</span>
          <h2 className="serif" style={{ margin: 0, fontSize: '20px', color: 'var(--gd)' }}>
            TASK REQUIRES MANUAL ASSIGNMENT
          </h2>
        </div>

        <div
          style={{
            textAlign: 'left',
            background: 'rgba(5, 18, 33, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '14px 16px',
            margin: '12px 0 16px',
            fontSize: '13.5px',
            lineHeight: 1.6
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: 'var(--mu)', fontWeight: 600 }}>Room:</span>
            <b style={{ color: '#fff' }}>{roomDisplay ? `Room ${roomDisplay}` : 'General Area'}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: 'var(--mu)', fontWeight: 600 }}>Request:</span>
            <b style={{ color: '#fff' }}>{task.description || task.guestRequest || task.type}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: 'var(--mu)', fontWeight: 600 }}>Department:</span>
            <span style={{ color: 'var(--ln)', fontWeight: 600 }}>{deptMap[taskDept] || taskDept.toUpperCase()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--mu)', fontWeight: 600 }}>Priority:</span>
            <Pill label={`${task.priority || 'HIGH'} PRIORITY`} />
          </div>
        </div>

        <form onSubmit={handleAssignSubmit}>
          <div style={{ textAlign: 'left', marginBottom: '14px' }}>
            <label className="l" style={{ marginBottom: '8px', display: 'block', fontWeight: 600 }}>
              Select Eligible Staff ({deptMap[taskDept] || taskDept.toUpperCase()})
            </label>

            {deptStaff.length > 0 ? (
              <div
                style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '1px solid var(--ln)',
                  borderRadius: '8px',
                  padding: '6px',
                  background: 'rgba(10, 25, 45, 0.5)'
                }}
              >
                {deptStaff.map((s) => {
                  const staffKey = s._id || s.id;
                  const staffDisplayId = s.staffCode || s.staffId || s.id;
                  const isOnDuty = s.duty === 'ON' || s.duty === 'ON_DUTY' || s.dutyStatus === 'ON_DUTY';
                  const isAvailable = (s.availability === 'AVAILABLE' || s.availability === 'available');
                  const isAccountEnabled = s.enabled !== false && s.enabled !== 'DISABLED' && s.enabled !== 'DELETED';
                  const isEligible = isOnDuty && isAvailable && isAccountEnabled;

                  return (
                    <label
                      key={staffKey}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        cursor: isEligible ? 'pointer' : 'not-allowed',
                        opacity: isEligible ? 1 : 0.6,
                        background: selectedStaffId === staffKey ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                        border: selectedStaffId === staffKey ? '1px solid var(--gd)' : '1px solid transparent',
                        marginBottom: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="radio"
                          name="assignedStaff"
                          value={staffKey}
                          checked={selectedStaffId === staffKey}
                          onChange={() => isEligible && setSelectedStaffId(staffKey)}
                          disabled={!isEligible || busy}
                          style={{ accentColor: 'var(--gd)', cursor: isEligible ? 'pointer' : 'not-allowed' }}
                        />
                        <div>
                          <b style={{ color: isEligible ? '#fff' : 'var(--mu)', fontSize: '13.5px' }}>
                            {s.name || s.fullName}
                          </b>
                          <span className="mu" style={{ fontSize: '12px', marginLeft: '6px' }}>
                            ({staffDisplayId})
                          </span>
                        </div>
                      </div>

                      <div className="row" style={{ gap: '6px' }}>
                        <Pill
                          label={
                            !isAccountEnabled
                              ? 'DISABLED'
                              : !isOnDuty
                              ? 'OFF DUTY'
                              : isAvailable
                              ? 'AVAILABLE'
                              : 'BUSY'
                          }
                        />
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="empty" style={{ padding: '16px' }}>
                <div className="mu">No staff members found for {deptMap[taskDept] || taskDept}.</div>
              </div>
            )}
          </div>

          <div className="row" style={{ justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button type="button" className="btn gh" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn gd"
              disabled={busy || !selectedStaffId}
              id="btn-confirm-assign-staff"
              style={{ flex: '1 1 140px', minWidth: 0, maxWidth: '220px', fontWeight: 700 }}
            >
              {busy ? <span className="spinner"></span> : null}
              {busy ? ' Assigning…' : 'ASSIGN STAFF'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
