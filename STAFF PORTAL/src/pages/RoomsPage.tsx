import React from 'react';
import { Pill } from '../components/Pill';

interface RoomsPageProps {
  rooms: {
    id: string;
    type: string;
    state: string;
    guest: string | null;
  }[];
  tasks: {
    id: string;
    department: string;
    roomId?: string | null;
    status: string;
    assignedStaffId: string | null;
    completedAt: number | null;
    beforeImage?: string | null;
    afterImage?: string | null;
    feedback?: string;
  }[];
  userDept: string;
  isOffDuty: boolean;
  busy: boolean;
  onReceptionDutyPrompt: () => void;
  onCheckout: (roomId: string) => void;
  onApproveRoom: (roomId: string) => void;
  onRejectRoom: (roomId: string) => void;
}

const fmt = (t: number | null | undefined) =>
  t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

export const RoomsPage: React.FC<RoomsPageProps> = ({
  rooms,
  tasks,
  userDept,
  isOffDuty,
  busy,
  onReceptionDutyPrompt,
  onCheckout,
  onApproveRoom,
  onRejectRoom
}) => {
  const isReception = userDept === 'reception';
  const isManager = userDept === 'manager';
  const inspections = rooms.filter((r) => r.state === 'INSPECTION REQUIRED');

  return (
    <>
      <h1 className="serif" style={{ marginBottom: '16px' }}>
        Room Inventory & Readiness
      </h1>

      <div className="grid g4">
        {rooms.map((r) => {
          const ht = tasks.filter(
            (t) => t.roomId === r.id && t.department === 'housekeeping' && t.status !== 'COMPLETED'
          ).length;
          const mt = tasks.filter(
            (t) => t.roomId === r.id && t.department === 'maintenance' && t.status !== 'COMPLETED'
          ).length;

          return (
            <div key={r.id} className="card">
              <div className="row bt">
                <b className="serif" style={{ fontSize: '22px' }}>
                  {r.id}
                </b>
                <Pill label={r.state} />
              </div>
              <div className="mu" style={{ margin: '4px 0' }}>
                {r.type}
                {r.guest ? (
                  <>
                    {' '}
                    · <b style={{ color: 'var(--tx)' }}>{r.guest}</b>
                  </>
                ) : null}
              </div>
              <div className="mu" style={{ fontSize: '12px', margin: '8px 0' }}>
                HK: {ht ? `${ht} open` : 'clear'} · Maint: {mt ? `${mt} open` : 'clear'}
              </div>

              {isReception && r.state === 'OCCUPIED' ? (
                <button
                  className="btn sm gh"
                  style={{ marginTop: '8px' }}
                  onClick={() => (isOffDuty ? onReceptionDutyPrompt() : onCheckout(r.id))}
                  disabled={busy}
                >
                  Check Out
                </button>
              ) : null}

              {isManager && r.state === 'INSPECTION REQUIRED' ? (
                <div className="row" style={{ marginTop: '8px' }}>
                  <button
                    className="btn sm gr"
                    onClick={() => onApproveRoom(r.id)}
                    disabled={busy}
                  >
                    APPROVE
                  </button>
                  <button
                    className="btn sm rd"
                    onClick={() => onRejectRoom(r.id)}
                    disabled={busy}
                  >
                    REWORK
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {isManager ? (
        <>
          <h2 style={{ marginTop: '28px' }}>Housekeeping Inspection Reviews</h2>
          {inspections.length > 0 ? (
            inspections.map((r) => {
              const t = [...tasks]
                .reverse()
                .find(
                  (tk) =>
                    tk.roomId === r.id &&
                    tk.department === 'housekeeping' &&
                    tk.status === 'COMPLETED'
                );
              return (
                <div key={r.id} className="card" style={{ marginBottom: '14px' }}>
                  <div className="row bt">
                    <b>Room {r.id} Inspection</b>
                    <span className="mu">
                      Completed by {t?.assignedStaffId || 'Housekeeper'} at {fmt(t?.completedAt)}
                    </span>
                  </div>
                  <div className="grid g2" style={{ margin: '10px 0' }}>
                    <div className="img">
                      {t?.beforeImage ? (
                        <img src={t.beforeImage} alt="Before" />
                      ) : (
                        'No before image attached'
                      )}
                    </div>
                    <div className="img">
                      {t?.afterImage ? (
                        <img src={t.afterImage} alt="After" />
                      ) : (
                        'No after image attached'
                      )}
                    </div>
                  </div>
                  <div className="mu">
                    Staff Feedback Notes:{' '}
                    <b style={{ color: 'var(--tx)' }}>{t?.feedback || 'None provided'}</b>
                  </div>
                  <div className="row" style={{ marginTop: '12px', justifyContent: 'flex-end' }}>
                    <button
                      className="btn sm rd"
                      onClick={() => onRejectRoom(r.id)}
                      disabled={busy}
                    >
                      SEND BACK FOR REWORK
                    </button>
                    <button
                      className="btn sm gr"
                      onClick={() => onApproveRoom(r.id)}
                      disabled={busy}
                    >
                      APPROVE & MARK READY
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty">
              <div style={{ fontSize: '26px', color: 'var(--gd)' }}>◈</div>
              <b>NO INSPECTIONS PENDING</b>
              <div className="mu" style={{ fontSize: '13px', marginTop: '4px' }}>
                Finished room cleanings awaiting manager signoff will appear here.
              </div>
            </div>
          )}
        </>
      ) : null}
    </>
  );
};
