import React from 'react';
import { Pill } from '../components/Pill';

interface DashboardPageProps {
  staff: {
    id: string;
    name: string;
    department: string;
    duty: string;
    availability: string;
    enabled: string;
    shiftStartTime?: string | number | null;
    dutyStartedAt?: string | number | null;
    lastAttendanceClosedReason?: string;
    lastAttendanceClosedAt?: string | number | null;
  };
  deptMap: Record<string, string>;
  emergencies: {
    id: string;
    room: string;
    text: string;
    ack: boolean;
    at: number;
  }[];
  tasks: {
    id: string;
    hotelId: string;
    department: string;
    type: string;
    roomId?: string | null;
    priority: string;
    description: string;
    guestRequest: string;
    status: string;
    offerStatus: string;
    assignmentState?: string;
    assignedStaffId: string | null;
    createdAt: number;
    startedAt: number | null;
    completedAt: number | null;
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
  feedbacks: {
    id: string;
    rating: number;
  }[];
  allStaff: {
    id: string;
    name: string;
    department: string;
    enabled: string | boolean;
    duty: string;
    dutyStatus?: string;
    availability: string;
  }[];

  notes: {
    type: string;
    msg: string;
    at: number;
  }[];
  requests: {
    id: string;
    department: string;
    room: string;
    text: string;
    at: number;
  }[];
  managerBoardDept: string;
  busy: boolean;
  onDutyToggle: () => void;
  onTaskClick: (id: string) => void;
  onStartTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
  onAckEmergency: (id: string) => void;
  onAssignEmergency: (id: string) => void;
  onOpenAssignStaff?: (task: any) => void;
  onOpenEmergencyDetail: (id: string) => void;
  onOpenVerifyModal: (id: string) => void;
  onSetManagerBoardDept: (dept: string) => void;
}

const fmt = (t: number | null | undefined) =>
  t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

export const DashboardPage: React.FC<DashboardPageProps> = ({
  staff,
  deptMap,
  emergencies,
  tasks,
  rooms,
  arrivals,
  feedbacks,
  allStaff,
  notes,
  requests,
  managerBoardDept,
  busy,
  onDutyToggle,
  onTaskClick,
  onStartTask,
  onCompleteTask,
  onAckEmergency,
  onAssignEmergency,
  onOpenAssignStaff,
  onOpenEmergencyDetail,
  onOpenVerifyModal,
  onSetManagerBoardDept
}) => {
  const isReception = staff.department === 'reception';
  const isDisp = ['housekeeping', 'maintenance', 'fnb'].includes(staff.department);
  const on = staff.duty === 'ON';

  const getGreeting = () => {
    const hr = new Date().getHours();
    return hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  };

  // Metrics computation
  const d = (staff.department || '').toLowerCase();
  const deptTasks = tasks.filter((t) => (t.department || '').toLowerCase() === d);
  const onDutyStaff = allStaff.filter(
    (s) =>
      (s.department || '').toLowerCase() === d &&
      (s.duty === 'ON' || s.duty === 'ON_DUTY' || s.dutyStatus === 'ON_DUTY') &&
      (s.enabled === 'ENABLED' || s.enabled === true || s.enabled === undefined)
  );

  let metrics: [string, string | number, string?][] = [];

  if (d === 'housekeeping') {
    metrics = [
      ['Tasks Dispatched', deptTasks.length],
      [
        'Pending Tasks',
        deptTasks.filter((t) => t.status === 'PENDING' || t.status === 'OFFERED' || t.status === 'ACCEPTED').length,
        '--o'
      ],
      ['Active Cleaning', deptTasks.filter((t) => t.status === 'IN PROGRESS' || t.status === 'IN_PROGRESS').length, '--bl'],
      ['Completed Today', deptTasks.filter((t) => t.status === 'COMPLETED').length, '--g'],
      ['Staff On Duty', onDutyStaff.length, '--g'],
      [
        'Rooms To Clean',
        rooms.filter((r) => r.state === 'CHECKOUT' || r.state === 'CLEANING').length,
        '--o'
      ],
      [
        'Inspections Needed',
        rooms.filter((r) => r.state === 'INSPECTION REQUIRED').length,
        '--pu'
      ],
      ['Ready Rooms', rooms.filter((r) => r.state === 'READY').length, '--g']
    ];
  } else if (d === 'maintenance') {
    metrics = [
      ['Total Work Orders', deptTasks.length],
      [
        'Pending Repairs',
        deptTasks.filter((t) => t.status === 'PENDING' || t.status === 'OFFERED' || t.status === 'ACCEPTED').length,
        '--o'
      ],
      ['Active Work', deptTasks.filter((t) => t.status === 'IN PROGRESS' || t.status === 'IN_PROGRESS').length, '--cy'],
      ['Repairs Completed', deptTasks.filter((t) => t.status === 'COMPLETED').length, '--g'],
      ['Technicians On Duty', onDutyStaff.length, '--g'],
      [
        'Emergency Work',
        deptTasks.filter((t) => t.priority === 'EMERGENCY' && t.status !== 'COMPLETED').length,
        '--r'
      ],
      [
        'Pending Inspections',
        rooms.filter((r) => r.state === 'INSPECTION REQUIRED').length,
        '--pu'
      ]
    ];
  } else if (d === 'fnb') {
    metrics = [
      ['Orders Received', deptTasks.length],
      [
        'Pending Orders',
        deptTasks.filter((t) => t.status === 'PENDING' || t.status === 'OFFERED' || t.status === 'ACCEPTED').length,
        '--o'
      ],
      ['Preparing / Delivery', deptTasks.filter((t) => t.status === 'IN PROGRESS' || t.status === 'IN_PROGRESS').length, '--bl'],
      ['Fulfilled Orders', deptTasks.filter((t) => t.status === 'COMPLETED').length, '--g'],
      ['Staff On Duty', onDutyStaff.length, '--g']
    ];
  } else if (d === 'reception') {
    metrics = [
      ["Today's Expected Arrivals", arrivals.length],
      ['Pending Check-ins', arrivals.filter((a) => a.status === 'EXPECTED').length, '--o'],
      ['In-House Guests', rooms.filter((r) => r.guest).length],
      ['Check-outs Pending', rooms.filter((r) => r.state === 'CHECKOUT').length],
      [
        'Available / Ready Rooms',
        rooms.filter((r) => r.state === 'AVAILABLE' || r.state === 'READY').length,
        '--g'
      ],
      ['Occupied Rooms', rooms.filter((r) => r.state === 'OCCUPIED').length, '--bl']
    ];
  } else {
    // Manager
    const totalStaff = allStaff.length;
    const onDutyCount = allStaff.filter(
      (s) =>
        (s.duty === 'ON' || s.duty === 'ON_DUTY' || s.dutyStatus === 'ON_DUTY') &&
        (s.enabled === 'ENABLED' || s.enabled === true || s.enabled === undefined)
    ).length;
    const availableCount = allStaff.filter(
      (s) =>
        (s.duty === 'ON' || s.duty === 'ON_DUTY' || s.dutyStatus === 'ON_DUTY') &&
        (s.availability === 'AVAILABLE' || s.availability === 'available') &&
        (s.enabled === 'ENABLED' || s.enabled === true || s.enabled === undefined)
    ).length;
    const busyCount = allStaff.filter(
      (s) =>
        (s.duty === 'ON' || s.duty === 'ON_DUTY' || s.dutyStatus === 'ON_DUTY') &&
        (s.availability === 'BUSY' || s.availability === 'busy') &&
        (s.enabled === 'ENABLED' || s.enabled === true || s.enabled === undefined)
    ).length;
    const suspendedCount = allStaff.filter((s) => s.enabled === 'SUSPENDED').length;
    const pendingStaffActions = allStaff.filter(
      (s) => s.enabled === 'SUSPENDED' || s.enabled === 'DISABLED'
    ).length;
    const avgRating = (
      feedbacks.reduce((acc, f) => acc + f.rating, 0) / (feedbacks.length || 1)
    ).toFixed(1);
    const unresolvedIssues =
      tasks.filter((t) => t.status !== 'COMPLETED').length +
      emergencies.filter((e) => !e.ack).length;

    metrics = [
      ['Total Staff', totalStaff, '--bl'],
      ['On Duty', onDutyCount, '--g'],
      ['Available', availableCount, '--g'],
      ['Busy Staff', busyCount, '--bl'],
      ['Suspended Staff', suspendedCount, '--r'],
      ['Pending Staff Actions', pendingStaffActions, '--o'],
      ['Customer Feedback', `${avgRating}★ (${feedbacks.length})`, '--gd'],
      ['Unresolved Issues', unresolvedIssues, unresolvedIssues > 0 ? '--r' : '--g']
    ];
  }

  const pendingEmergencies = emergencies.filter((e) => !e.ack);

  const renderTaskCard = (t: typeof tasks[0], canAct: boolean) => {
    const assignedStaff = allStaff.find((x) => x.id === t.assignedStaffId);
    const isAccepted = t.status === 'ACCEPTED';
    const isInProgress = t.status === 'IN PROGRESS' || t.status === 'IN_PROGRESS';
    const isCompleted = t.status === 'COMPLETED';
    const st = isAccepted ? 'ACCEPTED' : isInProgress ? 'IN PROGRESS' : isCompleted ? 'COMPLETED' : 'PENDING';
    const elapsedMinutes = t.startedAt ? Math.floor((Date.now() - t.startedAt) / 60000) : 0;
    const isManagerRole = staff.department === 'manager' || staff.department === 'MANAGER';

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
              renderTaskCard(t, viewerWorker && isMine(t))
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

  return (
    <>
      {/* Duty Banner */}
      <div className={`hero hero-duty ${on ? '' : 'off-duty'}`}>
        <div>
          <div
            className="mu"
            style={{
              color: '#9eb5ce',
              fontSize: '12px',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}
          >
            {getGreeting()} · {deptMap[staff.department]} Command
          </div>
          <h1 className="serif" style={{ margin: '4px 0 8px', fontSize: '26px' }}>
            {staff.name}
          </h1>
          <div className="row" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <span className="mu" style={{ color: '#cbd8e8', fontWeight: 600 }}>
              {staff.id}
            </span>
            <Pill label={on ? 'ON DUTY' : 'OFF DUTY'} />
            {on ? <Pill label={staff.availability} /> : null}
            <Pill label={staff.enabled} />
            {on && (staff.shiftStartTime || staff.dutyStartedAt) ? (
              <span className="mu" style={{ fontSize: '12px', color: 'var(--gd)', fontWeight: 600 }}>
                ⏱ Shift Started: {new Date(staff.shiftStartTime || staff.dutyStartedAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : null}
          </div>
          {!on && (staff.lastAttendanceClosedReason === 'AUTO_CLOSED_END_OF_DAY' || String(staff.lastAttendanceClosedReason).includes('AUTO')) ? (
            <div
              style={{
                marginTop: '10px',
                background: 'rgba(212, 175, 55, 0.15)',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                color: '#f0e6d2',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>🌙</span>
              <span>Your attendance was automatically closed at the end of the day (11:59 PM). Click <b>START DUTY</b> to begin your new shift.</span>
            </div>
          ) : null}
        </div>
        <div className="row">
          <button
            className={`btn ${on ? 'rd' : 'gd'} lg`}
            onClick={onDutyToggle}
            disabled={busy}
          >
            {busy ? <span className="spinner"></span> : null}
            {on ? '⏹ END DUTY' : '▶ START DUTY'}
          </button>
        </div>
      </div>

      <div style={{ height: '16px' }}></div>

      {/* Emergency Operational Alerts */}
      {pendingEmergencies.map((e) => (
        <div key={e.id} className="em">
          <div className="row bt">
            <b style={{ color: 'var(--r)', letterSpacing: '1.5px', fontSize: '13px' }}>
              ⚠ EMERGENCY OPERATIONAL ALERT
            </b>
            <Pill label="URGENT" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, margin: '6px 0' }}>Room {e.room}</div>
          <div style={{ color: '#fcd0d6', fontSize: '14px' }}>{e.text}</div>
          <div className="row" style={{ marginTop: '12px' }}>
            <button className="btn sm gh" onClick={() => onOpenEmergencyDetail(`E:${e.id}`)}>
              VIEW DETAILS
            </button>
            <button className="btn sm rd" onClick={() => onAckEmergency(e.id)}>
              ACKNOWLEDGE
            </button>
            <button className="btn sm" onClick={() => onAssignEmergency(e.id)}>
              DISPATCH REPAIR
            </button>
          </div>
        </div>
      ))}

      {/* Metrics Grid */}
      <div className="grid g4">
        {metrics.map(([label, val, colVar]) => (
          <div
            key={label}
            className="card met"
            style={{ '--k': `var(${colVar || '--ln'})` } as React.CSSProperties}
          >
            <b>{val}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div style={{ height: '18px' }}></div>

      {/* Main Board depending on department */}
      {isDisp ? (
        !on ? (
          <div className="empty">
            <div style={{ fontSize: '26px', color: 'var(--gd)' }}>◈</div>
            <b>YOU ARE CURRENTLY OFF DUTY</b>
            <div className="mu" style={{ fontSize: '13px', marginTop: '4px' }}>
              Click START DUTY above to enter the dispatch pool and receive operational task
              assignments.
            </div>
          </div>
        ) : (
          <>
            <div className="row bt" style={{ marginBottom: '12px' }}>
              <h2 style={{ margin: 0 }}>Live Task Board</h2>
              <Pill label="DISPATCH ACTIVE · Auto-offers enabled" />
            </div>
            {renderBoard(staff.department, true)}
          </>
        )
      ) : isReception ? (
        !on ? (
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
        ) : (
          <div className="grid g2">
            <div className="card">
              <h2>Expected Arrivals</h2>
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
              <h2>Front Desk Requests</h2>
              {requests.length > 0 ? (
                requests.map((r) => (
                  <div
                    key={r.id}
                    style={{ padding: '10px 0', borderBottom: '1px solid var(--ln)' }}
                  >
                    <div className="row bt">
                      <b>
                        Room {r.room} · {deptMap[r.department]}
                      </b>
                      <span className="mu" style={{ fontSize: '12px' }}>
                        {fmt(r.at)}
                      </span>
                    </div>
                    <div className="mu" style={{ marginTop: '4px', fontSize: '13px' }}>
                      {r.text}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty">
                  <div style={{ fontSize: '26px', color: 'var(--gd)' }}>◈</div>
                  <b>NO OPEN REQUESTS</b>
                  <div className="mu" style={{ fontSize: '13px', marginTop: '4px' }}>
                    Guest requests logged at front desk appear here.
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        // Manager Dashboard
        <>
          <div className="grid g2">
            <div className="card">
              <h2>Staff Live Status</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {allStaff.map((x) => (
                  <div
                    key={x.id}
                    className="row bt"
                    style={{ padding: '6px 0', borderBottom: '1px solid var(--ln)' }}
                  >
                    <div>
                      <b>{x.name}</b>{' '}
                      <span className="mu">
                        ({x.id}) · {deptMap[x.department]}
                      </span>
                    </div>
                    <div className="row">
                      <Pill label={x.enabled === false || x.enabled === 'DISABLED' ? 'DISABLED' : 'ENABLED'} />
                      <Pill label={x.duty === 'ON' ? x.availability : 'OFF DUTY'} />
                    </div>

                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2>Recent Operations Audit</h2>
              {notes.slice(0, 7).map((n, idx) => (
                <div
                  key={idx}
                  className="mu"
                  style={{ padding: '4px 0', borderBottom: '1px solid var(--ln)', fontSize: '12.5px' }}
                >
                  <span style={{ color: 'var(--gd)' }}>{fmt(n.at)}</span> · <b>{n.type}:</b>{' '}
                  {n.msg}
                </div>
              ))}
              {notes.length === 0 ? (
                <div className="empty">
                  <div style={{ fontSize: '26px', color: 'var(--gd)' }}>◈</div>
                  <b>NO ACTIVITY LOGGED YET</b>
                  <div className="mu" style={{ fontSize: '13px', marginTop: '4px' }}>
                    Live operations events will appear here.
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ height: '18px' }}></div>
          <div className="row bt">
            <h2 style={{ margin: 0 }}>Multi-Department Task Board</h2>
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
          </div>
          <div style={{ height: '10px' }}></div>
          {renderBoard(managerBoardDept, false)}
        </>
      )}
    </>
  );
};
