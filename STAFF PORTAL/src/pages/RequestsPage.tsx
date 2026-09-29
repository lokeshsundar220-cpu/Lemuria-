import React, { useState } from 'react';
import { Pill } from '../components/Pill';

interface RequestsPageProps {
  rooms: { id: string; type: string }[];
  requests: {
    id: string;
    department: string;
    room: string;
    text: string;
    at: number;
  }[];
  emergencies: {
    id: string;
    room: string;
    text: string;
    ack: boolean;
  }[];
  deptMap: Record<string, string>;
  isReception: boolean;
  isOffDuty: boolean;
  onLogRequest: (dept: string, room: string, text: string, priority: string) => void;
  onOpenEmergencyModal: () => void;
  onOpenEmergencyDetail: (id: string) => void;
  onAckEmergency: (id: string) => void;
  onAssignEmergency: (id: string) => void;
}

const fmt = (t: number | null | undefined) =>
  t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

export const RequestsPage: React.FC<RequestsPageProps> = ({
  rooms,
  requests,
  emergencies,
  deptMap,
  isReception,
  isOffDuty,
  onLogRequest,
  onOpenEmergencyModal,
  onOpenEmergencyDetail,
  onAckEmergency,
  onAssignEmergency
}) => {
  const [targetDept, setTargetDept] = useState('housekeeping');
  const [targetRoom, setTargetRoom] = useState(rooms[0]?.id || '201');
  const [requestText, setRequestText] = useState('');
  const [priority, setPriority] = useState('NORMAL');

  const pendingEmergencies = emergencies.filter((e) => !e.ack);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestText.trim()) return;
    onLogRequest(targetDept, targetRoom, requestText.trim(), priority);
    setRequestText('');
  };

  return (
    <>
      <h1 className="serif" style={{ marginBottom: '16px' }}>
        Guest Service Requests
      </h1>

      {/* Emergency alerts */}
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

      <div className="grid g2">
        <div className="card">
          <h2>Log New Guest Request</h2>
          <form onSubmit={handleSubmit}>
            <label className="l">Target Department</label>
            <select value={targetDept} onChange={(e) => setTargetDept(e.target.value)}>
              <option value="housekeeping">Housekeeping</option>
              <option value="maintenance">Maintenance</option>
              <option value="fnb">Food & Beverage</option>
            </select>

            <label className="l">Guest Room</label>
            <select value={targetRoom} onChange={(e) => setTargetRoom(e.target.value)}>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.id} ({r.type})
                </option>
              ))}
            </select>

            <label className="l">Request Details</label>
            <textarea
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              placeholder="e.g. Extra pillows, champagne delivery, HVAC temperature calibration…"
            />

            <label className="l">Priority Level</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="NORMAL">NORMAL</option>
              <option value="HIGH">HIGH</option>
            </select>

            <div className="row" style={{ marginTop: '16px' }}>
              <button
                type="submit"
                className="btn"
                disabled={isReception && isOffDuty}
              >
                DISPATCH REQUEST
              </button>
              <button
                type="button"
                className="btn rd"
                onClick={onOpenEmergencyModal}
              >
                ⚠ BROADCAST EMERGENCY
              </button>
            </div>
            {isReception && isOffDuty ? (
              <div
                className="mu"
                style={{ color: 'var(--o)', fontSize: '12px', marginTop: '8px' }}
              >
                ⚠ Front desk is OFF DUTY. Start duty to dispatch requests.
              </div>
            ) : null}
          </form>
        </div>

        <div className="card">
          <h2>Active Requests Log</h2>
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
    </>
  );
};
