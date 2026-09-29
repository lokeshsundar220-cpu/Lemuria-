import React, { useState } from 'react';

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

interface MyBookingsPageProps {
  reservation: Reservation | null;
  onNavigate: (route: string) => void;
}

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const MyBookingsPage: React.FC<MyBookingsPageProps> = ({ reservation, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Active' | 'Past' | 'Cancelled'>('Upcoming');

  const map: Record<string, string[]> = {
    Upcoming: ['CHECK_IN_PENDING', 'BOOKED'],
    Active: ['CHECKED_IN'],
    Past: ['CHECKED_OUT'],
    Cancelled: ['CANCELLED']
  };

  const list = reservation && map[activeTab].includes(reservation.status) ? [reservation] : [];

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
      <h2>My bookings</h2>
      <div className="tabs">
        {(['Upcoming', 'Active', 'Past', 'Cancelled'] as const).map((tab) => (
          <button
            key={tab}
            className={tab === activeTab ? 'on' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {list.length > 0 ? (
        <div className="grid">
          {list.map((r) => (
            <article key={r.id} className="card pad">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <b>{r.id}</b>
                {getStatusBadge(r.status)}
              </div>
              <h3>{r.hotel}</h3>
              <p className="mute small">
                {r.room} · {r.guests} guest(s)
                <br />
                {fmt(r.a)} → {fmt(r.b)}
              </p>
              <button
                className="btn sm ghost"
                style={{ color: 'var(--blue)' }}
                onClick={() => onNavigate('booking-details')}
              >
                View details
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="card center">
          <div className="ic">✦</div>
          <h3>No {activeTab.toLowerCase()} bookings</h3>
          <p className="mute">Nothing to show here yet.</p>
          <button className="btn" onClick={() => onNavigate('hotels')}>
            Explore hotels
          </button>
        </div>
      )}
    </>
  );
};
