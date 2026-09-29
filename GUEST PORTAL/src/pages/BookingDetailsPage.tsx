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
}

interface BookingDetailsPageProps {
  reservation: Reservation | null;
  onNavigate: (route: string) => void;
}

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const inr = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

export const BookingDetailsPage: React.FC<BookingDetailsPageProps> = ({
  reservation,
  onNavigate
}) => {
  if (!reservation) {
    return (
      <div className="card center">
        <div className="ic">✦</div>
        <h3>Booking not found</h3>
        <p className="mute">It may belong to another account.</p>
        <button className="btn" onClick={() => onNavigate('my-bookings')}>
          My bookings
        </button>
      </div>
    );
  }

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

  return (
    <>
      <div className="stay">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          {getStatusBadge(reservation.status)}
          <span style={{ color: '#9fb1c3' }}>{reservation.id}</span>
        </div>
        <h2 style={{ marginTop: '12px' }}>Your reservation</h2>
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
        </div>
      </div>

      <div className="card pad">
        <p>
          <b>Total paid/due:</b> {inr(reservation.total)}
          <br />
          <b>Guest:</b> {reservation.guest} · {reservation.guests} guest(s)
        </p>
      </div>
    </>
  );
};
