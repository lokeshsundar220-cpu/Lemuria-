import React from 'react';
import { Reservation, User, ServiceRequest } from '../services/api';

interface DashboardPageProps {
  user: User;
  reservation: Reservation | null;
  requests?: ServiceRequest[];
  isCheckedIn: boolean;
  onOpenServiceModal: (dept: string, item: string) => void;
  onNavigate: (route: string) => void;
  onToast: (msg: string) => void;
}

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const SERVICE_CATEGORIES = [
  {
    dept: 'Housekeeping',
    icon: '🧹',
    title: 'Housekeeping',
    desc: 'Room cleaning, fresh towels, bed linen & toiletries',
    primaryItem: 'Room cleaning'
  },
  {
    dept: 'Maintenance',
    icon: '🔧',
    title: 'Maintenance',
    desc: 'Report AC, electrical, plumbing or room fixture issues',
    primaryItem: 'AC'
  },
  {
    dept: 'Food & Beverage',
    icon: '🍽️',
    title: 'Food & Beverage',
    desc: 'In-room dining, breakfast, refreshments & special orders',
    primaryItem: 'Room service'
  },
  {
    dept: 'Concierge',
    icon: '🛎️',
    title: 'Concierge & Travel',
    desc: 'Luggage assistance, airport taxi & special requests',
    primaryItem: 'Hotel information'
  }
];

const getStatusBadge = (status: string) => {
  const norm = (status || '').toUpperCase();
  switch (norm) {
    case 'CHECK_IN_PENDING':
      return <span className="badge b-amber">Check-in Pending</span>;
    case 'BOOKED':
      return <span className="badge b-blue">Reservation Confirmed</span>;
    case 'CHECKED_IN':
      return <span className="badge b-green">Active In-House Stay</span>;
    case 'CHECKED_OUT':
      return <span className="badge b-grey">Checked Out</span>;
    default:
      return <span className="badge b-blue">{status}</span>;
  }
};

const getRequestBadgeClass = (status: string) => {
  const norm = (status || '').toUpperCase();
  if (norm === 'COMPLETED' || norm === 'RESOLVED') return 'b-green';
  if (norm === 'CANCELLED' || norm === 'DECLINED') return 'b-grey';
  if (norm === 'IN_PROGRESS' || norm === 'IN PROGRESS') return 'b-purple';
  if (norm === 'ACCEPTED' || norm === 'OFFERED' || norm === 'OFFERING') return 'b-blue';
  return 'b-amber';
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  reservation,
  requests = [],
  isCheckedIn,
  onOpenServiceModal,
  onNavigate,
  onToast
}) => {
  const getGreeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  const copyWifiPassword = (pwd: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pwd).then(
        () => onToast('Wi-Fi Password copied to clipboard'),
        () => onToast('Copy not available')
      );
    } else {
      onToast('Copy not available');
    }
  };

  const handleRequestClick = (dept: string, item: string) => {
    if (!isCheckedIn) {
      onToast('Service requests unlock once reception checks you in.');
      return;
    }
    onOpenServiceModal(dept, item);
  };

  const recentRequests = requests.slice(0, 3);
  const activeRequestsCount = requests.filter(
    (r) => !['COMPLETED', 'RESOLVED', 'CANCELLED', 'DECLINED'].includes((r.status || '').toUpperCase())
  ).length;

  return (
    <div className="dash-container">
      {/* Welcome Banner */}
      <div className="dash-welcome">
        <div>
          <span className="gold-sub">LEMURIA RESORTS & HOTELS</span>
          <h1 className="dash-title">
            {getGreeting()}, {user.name}
          </h1>
          <p className="dash-sub">
            Welcome to your personalized guest command portal. Manage your luxury stay, request room amenities, and connect with our 24/7 staff.
          </p>
        </div>
        <div className="dash-welcome-badge">
          <span className="vip-badge">✦ PREMIER GUEST</span>
        </div>
      </div>

      {/* Primary Stay Card */}
      {!reservation ? (
        <div className="stay-card empty-stay">
          <div className="stay-empty-inner">
            <span style={{ fontSize: '2.5rem' }}>🏰</span>
            <h2 style={{ color: 'var(--white)', margin: '8px 0' }}>No Active Booking Found</h2>
            <p style={{ color: '#cbd6e2', maxWidth: '420px', margin: '0 auto 18px' }}>
              Experience authentic Indian luxury hospitality across Mumbai, Goa & Ooty.
            </p>
            <button className="btn gold" onClick={() => onNavigate('hotels')}>
              Explore Luxury Rooms
            </button>
          </div>
        </div>
      ) : (
        <div className="stay-card">
          <div className="stay-top-row">
            <div className="stay-badge-group">
              {getStatusBadge(reservation.status)}
              <span className="stay-res-code">{reservation.id}</span>
            </div>
            {isCheckedIn && reservation.roomNumber && (
              <div className="stay-room-pill">
                ROOM {reservation.roomNumber}
              </div>
            )}
          </div>

          <h2 className="stay-hotel-name">{reservation.hotel}</h2>

          <div className="stay-grid">
            <div className="stay-metric">
              <small>ACCOMMODATION</small>
              <b>
                {isCheckedIn && reservation.roomNumber
                  ? `Room ${reservation.roomNumber} · ${reservation.room}`
                  : reservation.room}
              </b>
            </div>

            <div className="stay-metric">
              <small>CHECK-IN DATE</small>
              <b>{fmt(reservation.a)}</b>
            </div>

            <div className="stay-metric">
              <small>CHECK-OUT DATE</small>
              <b>{fmt(reservation.b)}</b>
            </div>

            <div className="stay-metric">
              <small>PARTY</small>
              <b>{reservation.guests} Guest(s)</b>
            </div>
          </div>

          {/* Pending Arrival Check-in Notice */}
          {reservation.status === 'CHECK_IN_PENDING' && (
            <div className="stay-notice warn">
              <span>🛎️</span>
              <div>
                <b>Arrival Verification Pending:</b> Please show your ID at the front desk reception upon arrival to receive your room key.
              </div>
            </div>
          )}

          {/* Post Checkout Notice */}
          {reservation.status === 'CHECKED_OUT' && (
            <div className="stay-actions-row">
              <button className="btn gold sm" onClick={() => onNavigate('my-bookings')}>
                View Booking History
              </button>
              <button className="btn ghost sm" style={{ color: '#fff' }} onClick={() => onNavigate('feedback')}>
                Leave Hotel Feedback
              </button>
            </div>
          )}
        </div>
      )}

      {/* In-House Wi-Fi & Key Perks Card (When Checked In) */}
      {isCheckedIn && reservation?.wifi && (
        <div className="wifi-banner">
          <div className="wifi-info">
            <div className="wifi-icon">📶</div>
            <div>
              <span className="wifi-tag">COMPLIMENTARY HIGH-SPEED IN-ROOM WI-FI</span>
              <div className="wifi-details">
                <span>Network: <b>{reservation.wifi.ssid}</b></span>
                <span className="wifi-sep">•</span>
                <span>Password: <b className="wifi-pass">{reservation.wifi.password}</b></span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn gold sm"
            onClick={() => copyWifiPassword(reservation.wifi!.password)}
          >
            Copy Password
          </button>
        </div>
      )}

      {/* Prominent "Request a Service" Section */}
      <section className="dash-section">
        <div className="dash-section-head">
          <div>
            <span className="gold-sub">IN-ROOM CONVENIENCE</span>
            <h2>Request a Service</h2>
            <p className="mute" style={{ margin: 0 }}>
              {isCheckedIn
                ? 'Select a department below for immediate assistance from our on-duty staff.'
                : 'Service requests unlock upon check-in at the front desk.'}
            </p>
          </div>
          {isCheckedIn && (
            <button
              type="button"
              className="btn sm ghost"
              style={{ color: 'var(--blue)' }}
              onClick={() => onNavigate('requests')}
            >
              My Requests {activeRequestsCount > 0 ? `(${activeRequestsCount} active)` : ''} →
            </button>
          )}
        </div>

        <div className="svc-category-grid">
          {SERVICE_CATEGORIES.map((cat) => (
            <div
              key={cat.dept}
              className={`svc-category-card ${!isCheckedIn ? 'locked-card' : ''}`}
            >
              <div className="svc-cat-icon">{cat.icon}</div>
              <div className="svc-cat-content">
                <h3 className="svc-cat-title">{cat.title}</h3>
                <p className="svc-cat-desc">{cat.desc}</p>
              </div>
              <button
                type="button"
                className={`btn sm ${isCheckedIn ? 'gold' : 'ghost'}`}
                onClick={() => handleRequestClick(cat.dept, cat.primaryItem)}
                disabled={!isCheckedIn}
                style={{ width: '100%', marginTop: 'auto' }}
              >
                {isCheckedIn ? `Request ${cat.dept}` : 'Locked (Check-in Required)'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Requests Preview Section (if any requests exist) */}
      {requests.length > 0 && (
        <section className="dash-section" style={{ marginTop: '36px' }}>
          <div className="dash-section-head">
            <div>
              <span className="gold-sub">LIVE OPERATIONS</span>
              <h2>Recent Service Requests</h2>
            </div>
            <button
              type="button"
              className="btn sm ghost"
              style={{ color: 'var(--blue)' }}
              onClick={() => onNavigate('requests')}
            >
              View All ({requests.length}) →
            </button>
          </div>

          <div className="recent-requests-grid">
            {recentRequests.map((r) => (
              <div
                key={r.id}
                className="recent-req-card"
                onClick={() => onNavigate('requests')}
                style={{ cursor: 'pointer' }}
              >
                <div className="recent-req-top">
                  <b>{r.dept}</b>
                  <span className={`badge ${getRequestBadgeClass(r.status)}`}>
                    {r.status}
                  </span>
                </div>
                <p className="recent-req-desc">{r.desc}</p>
                <div className="recent-req-meta">
                  <span>Req #{r.id}</span>
                  <span>{new Date(r.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Access Footer Tiles */}
      <section className="dash-quick-grid">
        <div
          className="dash-quick-tile"
          onClick={() => onNavigate('hotels')}
        >
          <span className="tile-icon">🏨</span>
          <b>Explore Hotels</b>
          <span className="tile-mute">Discover our properties in Mumbai, Goa & Ooty</span>
        </div>

        <div
          className="dash-quick-tile"
          onClick={() => onNavigate('my-bookings')}
        >
          <span className="tile-icon">📑</span>
          <b>My Bookings</b>
          <span className="tile-mute">View reservation codes & upcoming dates</span>
        </div>

        <div
          className="dash-quick-tile"
          onClick={() => onNavigate('feedback')}
        >
          <span className="tile-icon">★</span>
          <b>Guest Feedback</b>
          <span className="tile-mute">Rate your overall experience with Lemuria</span>
        </div>
      </section>
    </div>
  );
};
