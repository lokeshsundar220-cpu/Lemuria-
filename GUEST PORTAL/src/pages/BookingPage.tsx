import React, { useState } from 'react';

interface Hotel {
  id: string;
  name: string;
  city: string;
}

interface Room {
  id: string;
  hotel: string;
  type: string;
  price: number;
  guests: number;
}

interface User {
  name: string;
  email: string;
  mobile: string;
}

interface BookingPageProps {
  hotel: Hotel;
  room: Room;
  user: User | null;
  onCheckAvailability: (hotelId: string, roomId: string, a: string, b: string) => Promise<string>;
  onConfirmBooking: (bookingData: {
    hotel: string;
    room: string;
    a: string;
    b: string;
    guests: number;
    name: string;
    email: string;
    mobile: string;
  }) => Promise<void>;
  onNavigate: (route: string) => void;
  onToast: (msg: string) => void;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
};
const inr = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

export const BookingPage: React.FC<BookingPageProps> = ({
  hotel,
  room,
  user,
  onCheckAvailability,
  onConfirmBooking,
  onNavigate,
  onToast
}) => {
  const [checkIn, setCheckIn] = useState(() => addDays(1));
  const [checkOut, setCheckOut] = useState(() => addDays(3));
  const [guests, setGuests] = useState(1);
  const [availStatus, setAvailStatus] = useState<string | null>(null);

  const [guestName, setGuestName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [mobile, setMobile] = useState(user?.mobile || '');

  if (!user) {
    return (
      <div className="card center">
        <h3>Sign in to continue</h3>
        <p className="mute">
          You need an account to book {room.type} at {hotel.name}.
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn" onClick={() => onNavigate('login')}>
            Sign in
          </button>
          <button className="btn gold" onClick={() => onNavigate('register')}>
            Create account
          </button>
        </div>
      </div>
    );
  }

  const nights = Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 864e5));
  const subtotal = nights * room.price;
  const tax = Math.round(subtotal * 0.12);
  const total = subtotal + tax;

  const handleCheck = async () => {
    if (checkOut <= checkIn) {
      setAvailStatus(null);
      onToast('Check-out must be after check-in');
      return;
    }
    try {
      const status = await onCheckAvailability(hotel.id, room.id, checkIn, checkOut);
      setAvailStatus(status);
    } catch {
      setAvailStatus(null);
      onToast('Could not check availability');
    }
  };

  const handleConfirm = async () => {
    const nm = guestName.trim();
    const em = email.trim();
    const mo = mobile.trim();
    if (!nm || !/\S+@\S+\.\S+/.test(em) || mo.length < 8) {
      onToast('Enter your name, a valid email and mobile number');
      return;
    }
    try {
      await onConfirmBooking({
        hotel: hotel.id,
        room: room.id,
        a: checkIn,
        b: checkOut,
        guests,
        name: nm,
        email: em,
        mobile: mo
      });
      onNavigate('confirmed');
    } catch (err: unknown) {
      setAvailStatus(null);
      onToast((err as Error).message);
    }
  };

  return (
    <div className="form">
      <h2>Book {room.type}</h2>
      <p className="mute">
        {hotel.name}, {hotel.city}
      </p>

      <div className="two">
        <div>
          <label htmlFor="a">Check-in</label>
          <input
            id="a"
            type="date"
            min={addDays(0)}
            value={checkIn}
            onChange={(e) => {
              setCheckIn(e.target.value);
              setAvailStatus(null);
            }}
          />
        </div>
        <div>
          <label htmlFor="b">Check-out</label>
          <input
            id="b"
            type="date"
            min={addDays(1)}
            value={checkOut}
            onChange={(e) => {
              setCheckOut(e.target.value);
              setAvailStatus(null);
            }}
          />
        </div>
      </div>

      <label htmlFor="g">Guests</label>
      <select
        id="g"
        value={guests}
        onChange={(e) => setGuests(Number(e.target.value))}
      >
        {Array.from({ length: room.guests }, (_, k) => (
          <option key={k + 1} value={k + 1}>
            {k + 1}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="btn ghost block"
        style={{ color: 'var(--blue)', marginTop: '14px' }}
        onClick={handleCheck}
      >
        Check availability
      </button>

      {availStatus === 'AVAILABLE' && (
        <div className="box ok">
          <b>Available</b> — confirmed by the hotel for your dates.
        </div>
      )}
      {availStatus === 'ROOM_BOOKED' && (
        <div className="box bad">
          <b>Room already booked</b>
          <br />
          Unfortunately, this room is unavailable for the selected dates.
        </div>
      )}
      {availStatus === 'HOUSE_FULL' && (
        <div className="box bad">
          <b>House full</b>
          <br />
          No rooms are available for your selected dates.
        </div>
      )}

      <label htmlFor="nm">Guest name</label>
      <input
        id="nm"
        value={guestName}
        onChange={(e) => setGuestName(e.target.value)}
      />

      <label htmlFor="em">Email</label>
      <input
        id="em"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label htmlFor="mo">Mobile number</label>
      <input
        id="mo"
        type="tel"
        value={mobile}
        onChange={(e) => setMobile(e.target.value)}
      />

      <div className="card pad" style={{ margin: '18px 0' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span>Room × {nights} night(s)</span>
          <b>{inr(subtotal)}</b>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span>Taxes (12%)</span>
          <b>{inr(tax)}</b>
        </div>
        <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '12px 0' }} />
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <b>Total</b>
          <b style={{ fontSize: '1.3rem' }}>{inr(total)}</b>
        </div>
      </div>

      <button
        type="button"
        className="btn gold block"
        disabled={availStatus !== 'AVAILABLE' || nights <= 0}
        onClick={handleConfirm}
      >
        Confirm booking
      </button>
    </div>
  );
};
