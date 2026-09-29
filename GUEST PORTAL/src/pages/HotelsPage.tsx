import React from 'react';
import { HotelArt } from '../components/HotelArt';

interface Hotel {
  id: string;
  name: string;
  city: string;
  rating: number;
  from: number;
  blurb: string;
  am: string[];
}

interface HotelsPageProps {
  hotels: Hotel[];
  onNavigate: (route: string) => void;
}

const inr = (n: number) => '₹' + Number(n).toLocaleString('en-IN');
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

export const HotelsPage: React.FC<HotelsPageProps> = ({ hotels, onNavigate }) => {
  return (
    <>
      <h2>Explore Lemuria</h2>
      <div className="grid">
        {hotels.map((h, i) => (
          <article key={h.id} className="card">
            <HotelArt index={i} />
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
                style={{ marginTop: '12px' }}
                onClick={() => onNavigate(`hotel/${h.id}`)}
              >
                View hotel
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
};
