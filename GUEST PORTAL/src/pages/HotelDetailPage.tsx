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
  dining?: string;
  fac?: string;
}

interface Room {
  id: string;
  hotel: string;
  type: string;
  bed: string;
  guests: number;
  price: number;
  units: number;
  am: string[];
}

interface HotelDetailPageProps {
  hotel: Hotel;
  rooms: Room[];
  onNavigate: (route: string) => void;
}

const inr = (n: number) => '₹' + Number(n).toLocaleString('en-IN');
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

export const HotelDetailPage: React.FC<HotelDetailPageProps> = ({
  hotel,
  rooms,
  onNavigate
}) => {
  const hotelIndex = ['grand', 'bay', 'hills'].indexOf(hotel.id);

  return (
    <>
      <div className="card">
        <HotelArt index={hotelIndex >= 0 ? hotelIndex : 0} height={240} />
        <div className="pad">
          <span className="gold">{stars(hotel.rating)}</span>
          <h1 style={{ fontSize: '2.6rem' }}>{hotel.name}</h1>
          <p className="mute">{hotel.city}</p>
          <p>{hotel.blurb}</p>
          <p>
            <b>Amenities</b>{' '}
            {hotel.am.map((a) => (
              <span key={a} className="tag">
                {a}
              </span>
            ))}
          </p>
          <p>
            <b>Dining</b> {hotel.dining}
            <br />
            <b>Facilities</b> {hotel.fac}
          </p>
        </div>
      </div>

      <h2 style={{ marginTop: '32px' }}>Available rooms</h2>
      {rooms.length > 0 ? (
        <div className="grid">
          {rooms.map((r, k) => (
            <article key={r.id} className="card">
              <HotelArt index={k + 1} height={130} />
              <div className="pad">
                <h3>{r.type}</h3>
                <p className="mute small">
                  {r.bed} · up to {r.guests} guests
                </p>
                <div>
                  {r.am.map((a) => (
                    <span key={a} className="tag">
                      {a}
                    </span>
                  ))}
                </div>
                <p>
                  <b style={{ fontSize: '1.3rem' }}>{inr(r.price)}</b>{' '}
                  <span className="mute small">per night</span>
                </p>
                <button
                  className="btn gold block"
                  onClick={() => onNavigate(`book/${hotel.id}/${r.id}`)}
                >
                  Book this room
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card center">
          <div className="ic">✦</div>
          <h3>No rooms listed</h3>
          <p className="mute">This hotel has no rooms yet.</p>
        </div>
      )}
    </>
  );
};
