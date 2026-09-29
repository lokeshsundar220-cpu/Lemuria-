import React from 'react';

interface NotificationsPageProps {
  notes: {
    type: string;
    msg: string;
    to?: string;
    at: number;
    read: boolean;
  }[];
  userId: string;
  onReadAll: () => void;
}

const fmt = (t: number | null | undefined) =>
  t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notes,
  userId,
  onReadAll
}) => {
  const userNotes = notes.filter((x) => !x.to || x.to === userId);

  return (
    <>
      <div className="row bt" style={{ marginBottom: '16px' }}>
        <h1 className="serif">Operational Notifications</h1>
        <button className="btn sm gh" onClick={onReadAll}>
          Mark all as read
        </button>
      </div>

      <div className="card">
        {userNotes.length > 0 ? (
          userNotes.map((x, idx) => (
            <div
              key={idx}
              className="row bt"
              style={{
                padding: '12px 0',
                borderBottom: '1px solid var(--ln)',
                opacity: x.read ? 0.6 : 1
              }}
            >
              <div className="row">
                {!x.read ? (
                  <span
                    className="on-dot"
                    style={{ background: 'var(--bl)', boxShadow: '0 0 8px var(--bl)' }}
                  ></span>
                ) : null}
                <b>{x.type}</b>
                <span style={{ color: '#cbd8e8' }}>· {x.msg}</span>
              </div>
              <span className="mu" style={{ fontSize: '12px' }}>
                {fmt(x.at)}
              </span>
            </div>
          ))
        ) : (
          <div className="empty">
            <div style={{ fontSize: '26px', color: 'var(--gd)' }}>◈</div>
            <b>ALL CAUGHT UP</b>
            <div className="mu" style={{ fontSize: '13px', marginTop: '4px' }}>
              No notifications at this time.
            </div>
          </div>
        )}
      </div>
    </>
  );
};
