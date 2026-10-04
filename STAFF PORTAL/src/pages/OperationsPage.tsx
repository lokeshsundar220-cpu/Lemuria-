import React from 'react';
import { Pill } from '../components/Pill';

interface OperationsPageProps {
  staff: {
    id: string;
    name: string;
    department: string;
    duty: string;
    availability: string;
  };
  deptMap: Record<string, string>;
  tasks: {
    id: string;
    department: string;
    type: string;
    roomId?: string | null;
    priority: string;
    description: string;
    status: string;
    offerStatus: string;
    assignmentState?: string;
    assignedStaffId: string | null;
    createdAt: number;
    startedAt: number | null;
    estimatedDuration: number;
  }[];
  rooms: {
    id: string;
    type: string;
    state: string;
    guest: string | null;
  }[];
  arrivals: {
    id: string;
    guest: string;
    room: string;
    status: string;
    resId: string;
    party: string;
    nights: number;
    eta: string;
    rtype: string;
  }[];
  allStaff: {
    id: string;
    _id?: string;
    staffCode?: string;
    name: string;
    fullName?: string;
    department?: string;
  }[];
  managerBoardDept: string;
  busy: boolean;
  onDutyToggle: () => void;
  onTaskClick: (id: string) => void;
  onStartTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
  onOpenAssignStaff?: (task: any) => void;
  onCheckout: (roomId: string) => void;
  onOpenVerifyModal: (id: string) => void;
  onSetManagerBoardDept: (dept: string) => void;
}

const fmt = (t: number | null | undefined) =>
  t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

export const OperationsPage: React.FC<OperationsPageProps> = ({
  staff,
  deptMap,
  tasks,
  rooms,
  arrivals,
  allStaff,
  managerBoardDept,
  busy,
  onDutyToggle,
  onTaskClick,
  onStartTask,
  onCompleteTask,
  onOpenAssignStaff,
  onCheckout,
  onOpenVerifyModal,
  onSetManagerBoardDept
}) => {
  const isReception = staff.department === 'reception';
  const isDisp = ['housekeeping', 'maintenance', 'fnb'].includes(staff.department);
  const isManagerRole = staff.department === 'manager' || staff.department === 'MANAGER';
  const on = staff.duty === 'ON';

  const renderTaskCard = (t: typeof tasks[0], canAct: boolean) => {
    const assignedStaff = allStaff.find((x) => x.id === t.assignedStaffId || x._id === t.assignedStaffId || x.staffCode === t.assignedStaffId);
    const isAccepted = t.status === 'ACCEPTED';
    const isInProgress = t.status === 'IN PROGRESS' || t.status === 'IN_PROGRESS';
    const isCompleted = t.status === 'COMPLETED';
    const st = isAccepted ? 'ACCEPTED' : isInProgress ? 'IN PROGRESS' : isCompleted ? 'COMPLETED' : 'PENDING';
    const elapsedMinutes = t.startedAt ? Math.floor((Date.now() - t.startedAt) / 60000) : 0;

    return (
      <div
        key={t.id}
        className={`task ${t.priority}`}
        onClick={() => onTaskClick(t.id)}
      >
        <div className="row bt">
          <b>{t.roomId ? `ROOM ${t.roomId}` : 'GENERAL'}</b>
          <Pill label={t.priority} />
        </div>
        <div style={{ fontWeight: 600, margin: '4px 0 2px' }}>{t.type}</div>
        <div className="mu" style={{ fontSize: '12.5px' }}>
          {t.description}
        </div>
        <div className="row" style={{ margin: '10px 0 4px' }}>
          <Pill label={st} />
          <span className="mu" style={{ fontSize: '12px' }}>
            {fmt(t.createdAt)} · ~{t.estimatedDuration}m ·{' '}
            {assignedStaff ? assignedStaff.name : 'Unassigned'}
          </span>
        </div>

        {t.assignmentState === 'NEEDS_MANAGER' && !t.assignedStaffId ? (
          <div
            style={{
              background: 'rgba(212, 175, 55, 0.12)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11.5px',
              color: 'var(--gd)',
              margin: '6px 0',
              fontWeight: 600
            }}
          >
            TASK REQUIRES MANUAL ASSIGNMENT
          </div>
        ) : null}

        {t.status === 'IN PROGRESS' && t.startedAt ? (
          <div className="mu" style={{ fontSize: '12px' }}>
            Elapsed: <b>{elapsedMinutes} min</b> · Expected ~
            {fmt(t.startedAt + t.estimatedDuration * 60000)}
          </div>
        ) : null}

        {canAct && isAccepted ? (
          <div style={{ marginTop: '10px' }}>
            <button
              className="btn sm"
              onClick={(e) => {
                e.stopPropagation();
                onStartTask(t.id);
              }}
            >
              ▶ START TASK
            </button>
          </div>
        ) : null}

        {canAct && isInProgress ? (
          <div style={{ marginTop: '10px' }}>
            <button
              className="btn sm"
              onClick={(e) => {
                e.stopPropagation();
                onCompleteTask(t.id);
              }}
            >
              ✓ COMPLETE TASK
            </button>
          </div>
        ) : null}

        {isManagerRole && !t.assignedStaffId && onOpenAssignStaff ? (
          <div style={{ marginTop: '10px' }}>
            <button
              className="btn sm gd"
              onClick={(e) => {
                e.stopPropagation();
                onOpenAssignStaff(t);
              }}
            >
              ASSIGN STAFF
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  const renderBoard = (dept: string, viewerWorker: boolean) => {
    const list = tasks.filter((t) => (t.department || '').toLowerCase() === dept.toLowerCase());
    const pen = list.filter((t) => t.status === 'PENDING' || t.status === 'OFFERED' || t.status === 'ACCEPTED');
    const ip = list.filter((t) => t.status === 'IN PROGRESS' || t.status === 'IN_PROGRESS');
    const dn = list.filter((t) => t.status === 'COMPLETED');

    const isMine = (t: typeof tasks[0]) =>
      !t.assignedStaffId ||
      t.assignedStaffId === staff.id ||
      t.assignedStaffId === (staff as any).staffCode ||
      t.assignedStaffId === (staff as any).staffId ||
      t.assignedStaffId === (staff as any)._id;

    const filterWorker = (arr: typeof list) =>
      viewerWorker ? arr.filter(isMine) : arr;

    const filteredPen = filterWorker(pen);
    const filteredIp = filterWorker(ip);
    const filteredDn = filterWorker(dn).slice(-6).reverse();

    return (
      <div className="cols">
        <div className="col">
          <h3>
            PENDING & ASSIGNED
            <span>{filteredPen.length}</span>
          </h3>
          {filteredPen.length > 0 ? (
            filteredPen.map((t) =>
              renderTaskCard(t, viewerWorker && isMine(t) && !!t.assignedStaffId)
            )
          ) : (
            <div className="empty">
              <div style={{ fontSize: '26px', color: 'var(--gd)' }}>◈</div>
              <b>NO PENDING TASKS</b>
              <div className="mu" style={{ fontSize: '13px', marginTop: '4px' }}>
                Dispatch queue is clear.
              </div>
            </div>
          )}
        </div>

        <div className="col">
          <h3>
            IN PROGRESS
            <span>{filteredIp.length}</span>
          </h3>
          {filteredIp.length > 0 ? (
            filteredIp.map((t) =>
              renderTaskCard(t, viewerWorker && t.assignedStaffId === staff.id)
            )
          ) : (
            <div className="empty">
              <div style={{ fontSize: '26px', color: 'var(--gd)' }}>◈</div>
              <b>NO ACTIVE TASKS</b>
              <div className="mu" style={{ fontSize: '13px', marginTop: '4px' }}>
                All active assignments completed.
              </div>
            </div>
          )}
        </div>

        <div className="col">
          <h3>
            COMPLETED
            <span>{filteredDn.length}</span>
          </h3>
          {filteredDn.length > 0 ? (
            filteredDn.map((t) => renderTaskCard(t, false))
          ) : (
            <div className="empty">
              <div style={{ fontSize: '26px', color: 'var(--gd)' }}>◈</div>
              <b>NO COMPLETIONS YET</b>
              <div className="mu" style={{ fontSize: '13px', marginTop: '4px' }}>
                Completed tasks land here.
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isReception) {
    if (!on) {
      return (
        <>
          <h1 className="serif" style={{ marginBottom: '16px' }}>
            Front Desk Operations
          </h1>
          <div className="duty-gate">
            <div className="duty-gate-icon">🛎️</div>
            <h2 className="serif" style={{ fontSize: '22px', color: 'var(--gd)', marginBottom: '8px' }}>
              FRONT DESK DUTY STATION IS OFF DUTY
            </h2>
            <p
              style={{
                maxWidth: '580px',
                margin: '0 auto 20px',
                color: '#c0d3e8',
                fontSize: '14px',
                lineHeight: 1.6
              }}
            >
              Reception operational controls (guest verification, check-in, key assignment,
              check-outs, room approvals, and task dispatching) are locked while you are off duty.
            </p>
            <button className="btn gd lg" onClick={onDutyToggle} disabled={busy}>
              {busy ? <span className="spinner"></span> : null}
              ▶ START DUTY TO UNLOCK FRONT DESK
            </button>
          </div>
        </>
      );
    }

    const inHouse = rooms.filter((r) => r.guest);

    return (
      <>
        <div className="row bt" style={{ marginBottom: '16px' }}>
          <div>
            <h1 className="serif">Front Desk Operations</h1>
            <div className="mu" style={{ fontSize: '13px' }}>
              Manage arrivals, guest check-ins, departures, and active room states.
            </div>
          </div>
        </div>

        <div className="grid g2">
          <div className="card">
            <h2>Expected Arrivals & Check-in</h2>
            {arrivals.length > 0 ? (
              arrivals.map((a) => (
                <div
                  key={a.id}
                  className="row bt"
                  style={{ padding: '12px 0', borderBottom: '1px solid var(--ln)' }}
                >
                  <div>
                    <b style={{ fontSize: '14px' }}>{a.guest}</b>
                    <span className="mu">
                      {' '}
                      · Room {a.room} · {a.rtype}
                    </span>
                    <div className="mu" style={{ fontSize: '12px', marginTop: '2px' }}>
                      {a.party} · {a.nights} nights · ETA {a.eta} ·{' '}
                      <span className="gold">{a.resId}</span>
                    </div>
                  </div>
                  {a.status === 'EXPECTED' ? (
                    <div className="row">
                      <Pill label="AWAITING VERIFICATION" />
                      <button className="btn sm" onClick={() => onOpenVerifyModal(a.id)}>
                        Verify Guest
                      </button>
                    </div>
                  ) : (
                    <Pill label={a.status} />
                  )}
                </div>
              ))
            ) : (
              <div className="empty">
                <div style={{ fontSize: '26px', color: 'var(--gd)' }}>◈</div>
                <b>NO ARRIVALS EXPECTED</b>
                <div className="mu" style={{ fontSize: '13px', marginTop: '4px' }}>
                  All guests checked in for today.
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h2>In-House Guests & Check-out</h2>
            {inHouse.length > 0 ? (
              inHouse.map((r) => (
                <div
                  key={r.id}
                  className="row bt"
                  style={{ padding: '8px 0', borderBottom: '1px solid var(--ln)' }}
                >
                  <div>
                    <b>
                      Room {r.id} · {r.guest}
                    </b>
                    <div className="mu" style={{ fontSize: '12px' }}>
                      {r.type}
                    </div>
                  </div>
                  <button
                    className="btn sm gh"
                    onClick={() => onCheckout(r.id)}
                    disabled={busy}
                  >
                    Check Out
                  </button>
                </div>
              ))
            ) : (
              <div className="empty">
                <div style={{ fontSize: '26px', color: 'var(--gd)' }}>◈</div>
                <b>NO GUESTS CURRENTLY IN HOUSE</b>
                <div className="mu" style={{ fontSize: '13px', marginTop: '4px' }}>
                  Checked-in guests will appear here.
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // Housekeeping / Maintenance / F&B / Manager
  const currentBoardDept = isDisp ? staff.department : managerBoardDept;

  return (
    <>
      <div className="row bt" style={{ marginBottom: '16px' }}>
        <h1 className="serif">Operations Command</h1>
        {!isDisp ? (
          <div className="row">
            {['housekeeping', 'maintenance', 'fnb'].map((x) => (
              <button
                key={x}
                className={`btn sm ${managerBoardDept === x ? '' : 'gh'}`}
                onClick={() => onSetManagerBoardDept(x)}
              >
                {deptMap[x]}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {renderBoard(currentBoardDept, isDisp)}
    </>
  );
};
