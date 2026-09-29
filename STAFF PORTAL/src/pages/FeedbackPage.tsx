import React, { useState } from 'react';
import { Pill } from '../components/Pill';

interface FeedbackPageProps {
  feedbacks: {
    id: string;
    category: string;
    serviceType: string;
    guest: string;
    resId: string;
    room: string;
    taskName: string;
    staffId: string | null;
    staffName: string;
    rating: number;
    message: string;
    at: number;
  }[];
  hotelName: string;
  deptMap: Record<string, string>;
  onOpenAddFeedback: () => void;
}

const fmtDate = (t: number | null | undefined) =>
  t
    ? new Date(t).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '—';

export const FeedbackPage: React.FC<FeedbackPageProps> = ({
  feedbacks,
  hotelName,
  deptMap,
  onOpenAddFeedback
}) => {
  const [fbCategory, setFbCategory] = useState<'ALL' | 'SERVICE' | 'OVERALL'>('ALL');
  const [fbDept, setFbDept] = useState('ALL');
  const [fbRating, setFbRating] = useState(0);
  const [fbSort, setFbSort] = useState<'newest' | 'oldest' | 'rating-desc' | 'rating-asc'>('newest');

  const serviceList = feedbacks.filter((f) => f.category === 'SERVICE');
  const overallList = feedbacks.filter((f) => f.category === 'OVERALL');

  const filtered = feedbacks.filter((f) => {
    if (fbCategory !== 'ALL' && f.category !== fbCategory) return false;
    if (fbDept !== 'ALL') {
      if (fbDept === 'overall' && f.category !== 'OVERALL') return false;
      if (fbDept !== 'overall' && f.serviceType !== fbDept) return false;
    }
    if (fbRating > 0 && f.rating < fbRating) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (fbSort === 'newest') return b.at - a.at;
    if (fbSort === 'oldest') return a.at - b.at;
    if (fbSort === 'rating-desc') return b.rating - a.rating;
    if (fbSort === 'rating-asc') return a.rating - b.rating;
    return 0;
  });

  const avg = (feedbacks.reduce((a, b) => a + b.rating, 0) / (feedbacks.length || 1)).toFixed(1);
  const fiveStars = feedbacks.filter((f) => f.rating === 5).length;
  const fiveStarPercent = Math.round((fiveStars / (feedbacks.length || 1)) * 100);

  return (
    <>
      <div className="row bt" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="serif">Customer Feedback</h1>
          <div className="mu" style={{ fontSize: '13px' }}>
            Guest ratings and satisfaction reviews across all hotel services and overall stay.
          </div>
        </div>
        <button className="btn gd" onClick={onOpenAddFeedback}>
          ＋ SUBMIT GUEST FEEDBACK
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid g4" style={{ marginBottom: '18px' }}>
        <div className="card met" style={{ '--k': 'var(--gd)' } as React.CSSProperties}>
          <b>{avg} ★</b>
          <span>Overall Hotel Score</span>
        </div>
        <div className="card met" style={{ '--k': 'var(--bl)' } as React.CSSProperties}>
          <b>{feedbacks.length}</b>
          <span>Total Reviews</span>
        </div>
        <div className="card met" style={{ '--k': 'var(--g)' } as React.CSSProperties}>
          <b>
            {fiveStars} ({fiveStarPercent}%)
          </b>
          <span>5-Star Experiences</span>
        </div>
        <div className="card met" style={{ '--k': 'var(--cy)' } as React.CSSProperties}>
          <b>{serviceList.length}</b>
          <span>Service Feedback Items</span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${fbCategory === 'ALL' ? 'on' : ''}`}
          onClick={() => setFbCategory('ALL')}
        >
          All Feedback ({feedbacks.length})
        </button>
        <button
          className={`tab-btn ${fbCategory === 'SERVICE' ? 'on' : ''}`}
          onClick={() => setFbCategory('SERVICE')}
        >
          🛎️ Service / Request Feedback ({serviceList.length})
        </button>
        <button
          className={`tab-btn ${fbCategory === 'OVERALL' ? 'on' : ''}`}
          onClick={() => setFbCategory('OVERALL')}
        >
          👑 Overall Hotel Stay ({overallList.length})
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '18px', padding: '14px' }}>
        <div className="row bt" style={{ gap: '12px' }}>
          <div className="row" style={{ flex: 1, minWidth: '240px' }}>
            <select
              style={{ width: 'auto' }}
              value={fbDept}
              onChange={(e) => setFbDept(e.target.value)}
            >
              <option value="ALL">All Services</option>
              <option value="housekeeping">Housekeeping</option>
              <option value="maintenance">Maintenance</option>
              <option value="fnb">Food & Beverage</option>
              <option value="reception">Reception</option>
              <option value="overall">Overall Hotel Stay</option>
            </select>
            <select
              style={{ width: 'auto' }}
              value={fbRating}
              onChange={(e) => setFbRating(Number(e.target.value))}
            >
              <option value="0">All Ratings</option>
              <option value="5">5 Stars Only</option>
              <option value="4">4+ Stars</option>
              <option value="3">3+ Stars</option>
            </select>
            <select
              style={{ width: 'auto' }}
              value={fbSort}
              onChange={(e) =>
                setFbSort(e.target.value as 'newest' | 'oldest' | 'rating-desc' | 'rating-asc')
              }
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="rating-desc">Highest Rating</option>
              <option value="rating-asc">Lowest Rating</option>
            </select>
          </div>
          <div className="mu" style={{ fontSize: '12px' }}>
            Showing {filtered.length} reviews
          </div>
        </div>
      </div>

      {/* Feedback Cards Grid */}
      <div className="grid g2">
        {filtered.length > 0 ? (
          filtered.map((fb) => (
            <div key={fb.id} className="fb-card">
              <div className="row bt">
                <div className="row">
                  <span className="stars">
                    {'★'.repeat(fb.rating)}
                    {'☆'.repeat(5 - fb.rating)}
                  </span>
                  <Pill
                    label={
                      fb.category === 'OVERALL'
                        ? 'OVERALL STAY'
                        : deptMap[fb.serviceType]?.toUpperCase() || fb.serviceType.toUpperCase()
                    }
                    colorVar={fb.category === 'OVERALL' ? '--gd' : '--cy'}
                  />
                </div>
                <span className="mu" style={{ fontSize: '12px' }}>
                  {fmtDate(fb.at)}
                </span>
              </div>

              <div>
                <b style={{ fontSize: '15px' }}>{fb.guest}</b>
                <span className="mu">
                  {' '}
                  · Room {fb.room} · <span className="gold">{fb.resId}</span>
                </span>
                <div className="mu" style={{ fontSize: '12px', marginTop: '2px' }}>
                  <b>Hotel:</b> {hotelName} · <b>Service / Task:</b> {fb.taskName}
                </div>
              </div>

              <div className="fb-quote">"{fb.message}"</div>

              <div className="row bt" style={{ marginTop: 'auto', fontSize: '12px' }}>
                <span className="mu">
                  Staff involved:{' '}
                  <b style={{ color: 'var(--tx)' }}>{fb.staffName || 'Lemuria Operations Team'}</b>
                </span>
                {fb.staffId ? (
                  <span className="pill sm" style={{ '--c': 'var(--bl)' } as React.CSSProperties}>
                    {fb.staffId}
                  </span>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="empty">
            <div style={{ fontSize: '26px', color: 'var(--gd)' }}>◈</div>
            <b>NO FEEDBACK MATCHING CRITERIA</b>
            <div className="mu" style={{ fontSize: '13px', marginTop: '4px' }}>
              Adjust the filter options above to view guest feedback.
            </div>
          </div>
        )}
      </div>
    </>
  );
};
