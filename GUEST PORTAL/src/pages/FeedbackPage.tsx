import React, { useState } from 'react';

interface FeedbackEntry {
  rating: number;
  comment: string;
}

interface Reservation {
  status: string;
}

interface FeedbackPageProps {
  reservation: Reservation | null;
  hotelFeedback: FeedbackEntry | null;
  onSubmitHotelFeedback: (rating: number, comment: string) => Promise<void>;
  onNavigate: (route: string) => void;
  onToast: (msg: string) => void;
}

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

export const FeedbackPage: React.FC<FeedbackPageProps> = ({
  reservation,
  hotelFeedback,
  onSubmitHotelFeedback,
  onNavigate,
  onToast
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const canReview = reservation && ['CHECKED_IN', 'CHECKED_OUT'].includes(reservation.status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      onToast('Choose a star rating first');
      return;
    }
    try {
      await onSubmitHotelFeedback(rating, comment.trim());
      onToast('Feedback submitted');
    } catch {
      onToast('Could not send feedback');
    }
  };

  return (
    <>
      <h2>Overall hotel feedback</h2>
      {!canReview ? (
        <div className="card center">
          <div className="ic">✦</div>
          <h3>No stay to review</h3>
          <p className="mute">Feedback opens during or after your stay.</p>
        </div>
      ) : hotelFeedback ? (
        <div className="box ok">Thank you. Your rating: {stars(hotelFeedback.rating)}</div>
      ) : (
        <div className="card pad form">
          <h3>How was your overall stay?</h3>
          <div>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`star ${rating >= n ? 'on' : ''}`}
                aria-label={`${n} stars`}
                onClick={() => setRating(n)}
              >
                ★
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit}>
            <label htmlFor="c-hotel">Comment</label>
            <textarea
              id="c-hotel"
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button type="submit" className="btn" style={{ marginTop: '12px' }}>
              Submit hotel feedback
            </button>
          </form>
        </div>
      )}

      <p className="mute small" style={{ marginTop: '16px' }}>
        Service-specific ratings are given from{' '}
        <button
          type="button"
          style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          onClick={() => onNavigate('requests')}
        >
          My requests
        </button>{' '}
        after each request is completed.
      </p>
    </>
  );
};
