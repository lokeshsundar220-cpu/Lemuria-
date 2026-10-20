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

interface HotelsPageProps {
  hotels: Hotel[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onNavigate: (route: string) => void;
}

const inr = (n: number) => '₹' + Number(n).toLocaleString('en-IN');
const stars = (n: number) => '★'.repeat(Math.max(1, Math.min(5, n))) + '☆'.repeat(Math.max(0, 5 - n));

export const HotelsPage: React.FC<HotelsPageProps> = ({
  hotels,
  isLoading = false,
  error = null,
  onRetry,
  onNavigate
}) => {
  return (
    <>
      <div className="hotels-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Explore Lemuria</h2>
          <p className="mute" style={{ margin: '4px 0 0' }}>
            Discover luxury resorts and private sanctuaries across India
          </p>
        </div>
        {onRetry && !isLoading && (
          <button
            className="btn ghost small-btn"
            onClick={onRetry}
            title="Refresh hotel availability"
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            ↻ Refresh
          </button>
        )}
      </div>

      {/* Loading Skeleton State */}
      {isLoading && (
        <div className="grid">
          {[1, 2, 3].map((idx) => (
            <article key={`skel-${idx}`} className="card hotel-skeleton-card">
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
        <div className="card pad center" style={{ margin: '24px 0', border: '1px solid #f87171' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>⚠️</div>
          <h3 style={{ color: 'var(--red)' }}>Unable to load hotels</h3>
          <p className="mute" style={{ maxWidth: '460px', margin: '0 auto 18px' }}>
            {error}
          </p>
          {onRetry && (
            <button className="btn gold" onClick={onRetry}>
              Retry Loading Hotels
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && hotels.length === 0 && (
        <div className="card pad center" style={{ margin: '32px 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>✦</div>
          <h3>No Hotels Available</h3>
          <p className="mute" style={{ maxWidth: '420px', margin: '0 auto 18px' }}>
            There are currently no active Lemuria properties listed for booking.
          </p>
          {onRetry && (
            <button className="btn ghost" onClick={onRetry}>
              Refresh Properties
            </button>
          )}
        </div>
      )}

      {/* Loaded Hotels List */}
      {!isLoading && !error && hotels.length > 0 && (
        <div className="grid">
          {hotels.map((h, i) => {
            const cardKey = h._id || h.hotelCode || h.code || h.id || `hotel-${i}`;
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
    </>
  );
};
