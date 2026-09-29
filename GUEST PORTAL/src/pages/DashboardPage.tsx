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

interface User {
  name: string;
}

interface DashboardPageProps {
  user: User;
  reservation: Reservation | null;
  onNavigate: (route: string) => void;
  onToast: (msg: string) => void;
}

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  reservation,
  onNavigate,
  onToast
}) => {
  const getGreeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CHECK_IN_PENDING':
        return <span className="badge b-amber">Check-in pending</span>;
      case 'BOOKED':
        return <span className="badge b-blue">Booked</span>;
      case 'CHECKED_IN':
        return <span className="badge b-green">Active stay</span>;
      case 'CHECKED_OUT':
        return <span className="badge b-grey">Checked out</span>;
      default:
        return <span className="badge b-grey">{status}</span>;
    }
  };

  const getHead = (status: string) => {
    switch (status) {
      case 'CHECK_IN_PENDING':
        return 'Your stay is confirmed';
      case 'CHECKED_IN':
        return 'Welcome to Lemuria';
      case 'CHECKED_OUT':
        return 'Thank you for staying with Lemuria';
      default:
        return 'Your booking';
    }
  };

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

  return (
    <>
      <h2>
        {getGreeting()}, {user.name}
      </h2>

      {!reservation ? (
        <div className="stay">
          <h2>No active booking</h2>
          <p style={{ color: '#cbd6e2' }}>Book your next Lemuria stay.</p>
          <button className="btn gold" onClick={() => onNavigate('hotels')}>
            Explore rooms
          </button>
        </div>
      ) : (
        <div className="stay">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            {getStatusBadge(reservation.status)}
            <span style={{ color: '#9fb1c3' }}>{reservation.id}</span>
          </div>
          <h2 style={{ marginTop: '12px' }}>{getHead(reservation.status)}</h2>
          <div className="kv">
            <div>
              <small>Hotel</small>
              <b>{reservation.hotel}</b>
            </div>
            <div>
              <small>Room</small>
              <b>
                {reservation.status === 'CHECKED_IN' && reservation.roomNumber
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

          {reservation.status === 'CHECK_IN_PENDING' && (
            <div className="box warn">Please visit reception for arrival verification.</div>
          )}

          {reservation.status === 'CHECKED_OUT' && (
            <div className="row">
              <button className="btn gold" onClick={() => onNavigate('my-bookings')}>
                View booking history
              </button>
              <button className="btn ghost" onClick={() => onNavigate('feedback')}>
                Give feedback
              </button>
            </div>
          )}
        </div>
      )}

      {reservation?.status === 'CHECK_IN_PENDING' && (
        <div className="grid">
          <div className="locked">
            <b>🔒 Wi-Fi</b>
            <br />
            <span className="small">Available after check-in.</span>
          </div>
          <div className="locked">
            <b>🔒 Room services</b>
            <br />
            <span className="small">Available after check-in.</span>
          </div>
          <div className="locked">
            <b>🔒 Room controls</b>
            <br />
            <span className="small">Available after check-in.</span>
          </div>
        </div>
      )}

      {reservation?.status === 'CHECKED_IN' && (
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
            <h3>Request a service</h3>
            <p className="mute">Housekeeping, maintenance, dining, concierge.</p>
          </div>

          <div
            className="card pad"
            style={{ cursor: 'pointer' }}
            onClick={() => onNavigate('requests')}
          >
            <h3>Track requests</h3>
            <p className="mute">See status from staff in real time.</p>
          </div>
        </div>
      )}
    </>
  );
};
