import React from 'react';

interface Reservation {
  id: string;
  hotel: string;
  room: string;
  guest: string;
  a: string;
  b: string;
  guests: number;
  total: number;
  status: string;
}

interface BookingConfirmedPageProps {
  reservation: Reservation | null;
  onNavigate: (route: string) => void;
}

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const inr = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

export const BookingConfirmedPage: React.FC<BookingConfirmedPageProps> = ({
  reservation,
  onNavigate
}) => {
  if (!reservation) {
    return (
      <div className="card center">
        <div className="ic">✦</div>
        <h3>No booking to show</h3>
        <p className="mute">Book a room to see your confirmation.</p>
        <button className="btn" onClick={() => onNavigate('hotels')}>
          Explore hotels
        </button>
      </div>
    );
  }

  return (
    <div className="stay" style={{ textAlign: 'center' }}>
      <p style={{ color: 'var(--gold)' }}>Lemuria booking</p>
      <h2>Booking confirmed</h2>
      <div className="kv" style={{ textAlign: 'left' }}>
        <div>
          <small>Booking ID</small>
          <b>{reservation.id}</b>
        </div>
        <div>
          <small>Hotel</small>
          <b>{reservation.hotel}</b>
        </div>
        <div>
          <small>Room</small>
          <b>{reservation.room}</b>
        </div>
        <div>
          <small>Guest</small>
          <b>{reservation.guest}</b>
        </div>
        <div>
          <small>Check-in</small>
          <b>{fmt(reservation.a)}</b>
        </div>
        <div>
          <small>Check-out</small>
          <b>{fmt(reservation.b)}</b>
        </div>
        <div>
          <small>Guests</small>
          <b>{reservation.guests}</b>
        </div>
        <div>
          <small>Total</small>
          <b>{inr(reservation.total)}</b>
        </div>
      </div>
      <span className="badge b-amber">Check-in pending</span>
      <div className="row" style={{ justifyContent: 'center', marginTop: '18px' }}>
        <button className="btn gold" onClick={() => onNavigate('my-bookings')}>
          View my booking
        </button>
        <button className="btn ghost" onClick={() => onNavigate('dashboard')}>
          Go to my stay
        </button>
      </div>
    </div>
  );
};
