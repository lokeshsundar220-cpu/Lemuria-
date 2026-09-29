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

interface HomePageProps {
  hotels: Hotel[];
  isLoggedIn: boolean;
  onNavigate: (route: string) => void;
}

const inr = (n: number) => '₹' + Number(n).toLocaleString('en-IN');
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

export const HomePage: React.FC<HomePageProps> = ({ hotels, isLoggedIn, onNavigate }) => {
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
        <h2>Featured hotels</h2>
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
