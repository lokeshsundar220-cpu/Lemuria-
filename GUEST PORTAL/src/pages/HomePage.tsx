import React from 'react';
import { HotelCardImage } from '../components/HotelCardImage';

export interface Hotel {
  id: string;
  _id?: string;
  name: string;
  city: string;
  rating: number;
  from: number;
  blurb: string;
  am: string[];
  imageUrl?: string;
  hotelCode?: string;
  code?: string;
}

interface HomePageProps {
  hotels: Hotel[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  isLoggedIn: boolean;
  onNavigate: (route: string) => void;
}

const inr = (n: number) => '₹' + Number(n).toLocaleString('en-IN');
const stars = (n: number) => '★'.repeat(Math.max(1, Math.min(5, n))) + '☆'.repeat(Math.max(0, 5 - n));

export const HomePage: React.FC<HomePageProps> = ({
  hotels,
  isLoading = false,
  error = null,
  onRetry,
  isLoggedIn,
  onNavigate
}) => {
  return (
    <>
      <div className="hero">
        <svg viewBox="0 0 600 300" aria-hidden="true">
          <circle cx="420" cy="90" r="46" fill="#D4A84F" opacity=".85" />
          <path
            d="M0 300V190h60v-60h70v60h40v-90h90v90h50v-40h80v40h60v-70h100v170z"
            fill="#0a2540"
          />
          <path d="M0 300V230h600v70z" fill="#0d2f4d" />
        </svg>
        <div className="in">
          <h1>Stay beautifully. Experience effortlessly.</h1>
          <p>Book a room, check in with reception and run your whole stay from your phone.</p>
          <div className="row">
            <button className="btn gold" onClick={() => onNavigate('hotels')}>
              Explore hotels
            </button>
            <button className="btn ghost" onClick={() => onNavigate('my-bookings')}>
              My bookings
            </button>
          </div>
          {!isLoggedIn && (
            <div className="row" style={{ marginTop: '14px' }}>
              <button
                style={{ background: 'none', border: 'none', color: '#cbd6e2', cursor: 'pointer', padding: 0 }}
                onClick={() => onNavigate('login')}
              >
                Sign in
              </button>
              <button
                style={{ background: 'none', border: 'none', color: '#cbd6e2', cursor: 'pointer', padding: 0 }}
                onClick={() => onNavigate('register')}
              >
                Create account
              </button>
            </div>
          )}
        </div>
      </div>

      <section className="blk">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2>Featured hotels</h2>
          {hotels.length > 0 && !isLoading && (
            <button
              className="btn ghost small-btn"
              onClick={() => onNavigate('hotels')}
              style={{ padding: '6px 14px', fontSize: '0.85rem' }}
            >
              View all ({hotels.length}) →
            </button>
          )}
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="grid">
            {[1, 2, 3].map((idx) => (
              <article key={`home-skel-${idx}`} className="card hotel-skeleton-card">
                <div
                  className="hotel-skeleton-media"
                  style={{
                    height: '190px',
                    background: 'linear-gradient(90deg, #071A2B 20%, #0d2f4d 50%, #071A2B 80%)',
                    backgroundSize: '200% 100%',
                    animation: 'hotelShimmer 1.6s infinite'
                  }}
                />
                <div className="pad">
                  <div style={{ width: '80px', height: '14px', background: '#e3decb', borderRadius: '4px', marginBottom: '10px' }} />
                  <div style={{ width: '65%', height: '22px', background: '#e3decb', borderRadius: '4px', marginBottom: '8px' }} />
                  <div style={{ width: '45%', height: '14px', background: '#e3decb', borderRadius: '4px', marginBottom: '14px' }} />
                  <div style={{ width: '100%', height: '36px', background: '#f0ede6', borderRadius: '8px' }} />
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="card pad center" style={{ margin: '16px 0', border: '1px solid #f87171' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠️</div>
            <h3 style={{ color: 'var(--red)', margin: '0 0 8px' }}>Unable to load hotels</h3>
            <p className="mute" style={{ maxWidth: '440px', margin: '0 auto 16px' }}>
              {error}
            </p>
            {onRetry && (
              <button className="btn gold" onClick={onRetry}>
                Retry Loading
              </button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && hotels.length === 0 && (
          <div className="card pad center" style={{ margin: '16px 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✦</div>
            <h3>No Hotels Available</h3>
            <p className="mute">There are currently no active Lemuria hotels listed.</p>
            {onRetry && (
              <button className="btn ghost" onClick={onRetry}>
                Refresh
              </button>
            )}
          </div>
        )}

        {/* Hotel Cards */}
        {!isLoading && !error && hotels.length > 0 && (
          <div className="grid">
            {hotels.map((h, i) => {
              const cardKey = h._id || h.hotelCode || h.code || h.id || `home-hotel-${i}`;
              return (
                <article key={cardKey} className="card hotel-listing-card">
                  <HotelCardImage
                    imageUrl={h.imageUrl}
                    name={h.name}
                    index={i}
                    height={190}
                  />
                  <div className="pad">
                    <span className="gold">{stars(h.rating)}</span>
                    <h3>{h.name}</h3>
                    <p className="mute small">
                      {h.city} · from {inr(h.from)}/night
                    </p>
                    <p>{h.blurb}</p>
                    <div>
                      {h.am.map((a) => (
                        <span key={a} className="tag">
                          {a}
                        </span>
                      ))}
                    </div>
                    <button
                      className="btn block"
                      style={{ marginTop: '14px' }}
                      onClick={() => onNavigate(`hotel/${h.id}`)}
                    >
                      View hotel
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="blk">
        <h2>Guest services, when you're in the room</h2>
        <div className="grid">
          {[
            ['Housekeeping', 'Cleaning, fresh towels, supplies'],
            ['Maintenance', 'AC, electrical, plumbing'],
            ['Food & beverage', 'Breakfast, room service, dining'],
            ['Concierge', 'Travel help and special requests']
          ].map(([title, desc]) => (
            <div key={title} className="card pad">
              <h3>{title}</h3>
              <p className="mute">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="blk">
        <h2>Why Lemuria</h2>
        <div className="grid">
          <div className="card pad">
            <h3>Verified arrival</h3>
            <p className="mute">Reception confirms every guest before room access unlocks.</p>
          </div>
          <div className="card pad">
            <h3>Live request tracking</h3>
            <p className="mute">Follow each request from sent to completed.</p>
          </div>
          <div className="card pad">
            <h3>Emergency help, always visible</h3>
            <p className="mute">One tap during your stay, in your own words.</p>
          </div>
        </div>
      </section>

      <footer>LEMURIA HOTEL · Guest Portal</footer>
    </>
  );
};
