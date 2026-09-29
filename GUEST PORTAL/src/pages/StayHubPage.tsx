import React from 'react';

interface Reservation {
  id: string;
  hotel: string;
  room: string;
  roomNumber?: string | null;
  guest: string;
  a: string;
  b: string;
  guests: number;
  total: number;
  status: string;
  checkedInAt?: number | null;
  wifi?: { ssid: string; password: string } | null;
}

interface StayHubPageProps {
  reservation: Reservation | null;
  onNavigate: (route: string) => void;
  onToast: (msg: string) => void;
}

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const StayHubPage: React.FC<StayHubPageProps> = ({
  reservation,
  onNavigate,
  onToast
}) => {
  const isCheckedIn = reservation?.status === 'CHECKED_IN';

  const copyWifiPassword = (pwd: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pwd).then(
        () => onToast('Password copied'),
        () => onToast('Copy not available')
      );
    } else {
      onToast('Copy not available');
    }
  };

  if (!isCheckedIn || !reservation) {
    return (
      <>
        {reservation ? (
          <div className="stay">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="badge b-amber">Check-in pending</span>
              <span style={{ color: '#9fb1c3' }}>{reservation.id}</span>
            </div>
            <h2 style={{ marginTop: '12px' }}>Your stay is confirmed</h2>
            <div className="kv">
              <div>
                <small>Hotel</small>
                <b>{reservation.hotel}</b>
              </div>
              <div>
                <small>Room</small>
                <b>{reservation.room}</b>
              </div>
              <div>
                <small>Check-in</small>
                <b>{fmt(reservation.a)}</b>
              </div>
              <div>
                <small>Check-out</small>
                <b>{fmt(reservation.b)}</b>
              </div>
            </div>
            <div className="box warn">Please visit reception for arrival verification.</div>
          </div>
        ) : (
          <div className="stay">
            <h2>No active booking</h2>
            <p style={{ color: '#cbd6e2' }}>Book your next Lemuria stay.</p>
            <button className="btn gold" onClick={() => onNavigate('hotels')}>
              Explore rooms
            </button>
          </div>
        )}
        <div className="locked">
          <b>🔒 Stay hub</b>
          <br />
          <span className="small">Available once reception checks you in.</span>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="stay">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="badge b-green">Active stay</span>
          <span style={{ color: '#9fb1c3' }}>{reservation.id}</span>
        </div>
        <h2 style={{ marginTop: '12px' }}>Welcome to Lemuria</h2>
        <div className="kv">
          <div>
            <small>Hotel</small>
            <b>{reservation.hotel}</b>
          </div>
          <div>
            <small>Room</small>
            <b>
              {reservation.roomNumber
                ? `${reservation.roomNumber} · ${reservation.room}`
                : reservation.room}
            </b>
          </div>
          <div>
            <small>Check-in</small>
            <b>{fmt(reservation.a)}</b>
          </div>
          <div>
            <small>Check-out</small>
            <b>{fmt(reservation.b)}</b>
          </div>
          {reservation.checkedInAt ? (
            <div>
              <small>Checked in at</small>
              <b>
                {new Date(reservation.checkedInAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </b>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid">
        {reservation.wifi && (
          <div className="card pad">
            <h3>Wi-Fi</h3>
            <p className="mute small">Network</p>
            <b>{reservation.wifi.ssid}</b>
            <p className="mute small" style={{ marginTop: '10px' }}>
              Password
            </p>
            <b style={{ fontSize: '1.25rem', letterSpacing: '.06em' }}>
              {reservation.wifi.password}
            </b>
            <br />
            <button
              className="btn sm"
              style={{ marginTop: '12px' }}
              onClick={() => copyWifiPassword(reservation.wifi!.password)}
            >
              Copy password
            </button>
          </div>
        )}

        <div
          className="card pad"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate('services')}
        >
          <h3>Services</h3>
          <p className="mute">Send a request to the team.</p>
        </div>

        <div
          className="card pad"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate('requests')}
        >
          <h3>Requests</h3>
          <p className="mute">Track and rate them.</p>
        </div>

        <div
          className="card pad"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate('notifications')}
        >
          <h3>Notifications</h3>
        </div>

        <div
          className="card pad"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate('feedback')}
        >
          <h3>Feedback</h3>
          <p className="mute">Tell us about your stay.</p>
        </div>
      </div>
    </>
  );
};
