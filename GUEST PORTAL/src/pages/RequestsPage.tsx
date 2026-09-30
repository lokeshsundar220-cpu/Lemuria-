import React, { useState } from 'react';
import { ServiceRequest, FeedbackEntry, Reservation } from '../services/api';

interface RequestsPageProps {
  requests: ServiceRequest[];
  reservation?: Reservation | null;
  feedbackMap: Record<string, FeedbackEntry>;
  isCheckedIn: boolean;
  onOpenServiceModal?: (dept: string, item: string) => void;
  onSubmitFeedback: (reqId: string, rating: number, comment: string) => Promise<void>;
  onNavigate: (route: string) => void;
  onToast: (msg: string) => void;
}

const DEPT_ICONS: Record<string, string> = {
  HOUSEKEEPING: '🧹',
  Housekeeping: '🧹',
  MAINTENANCE: '🔧',
  Maintenance: '🔧',
  FOOD_AND_BEVERAGE: '🍽️',
  'Food & Beverage': '🍽️',
  FNB: '🍽️',
  CONCIERGE: '🛎️',
  Concierge: '🛎️',
  EMERGENCY: '🚨',
  Emergency: '🚨'
};

const STEP_STAGES = [
  { key: 'REQUESTED', label: 'Requested' },
  { key: 'OFFERING', label: 'Offering' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' }
];

const getStepIndex = (status: string): number => {
  const norm = (status || '').toUpperCase();
  if (norm === 'COMPLETED' || norm === 'RESOLVED') return 4;
  if (norm === 'IN_PROGRESS' || norm === 'IN PROGRESS') return 3;
  if (norm === 'ACCEPTED' || norm === 'ASSIGNED') return 2;
  if (norm === 'OFFERING' || norm === 'OFFERED') return 1;
  return 0; // REQUESTED / OPEN / PENDING
};

const getStatusBadge = (status: string) => {
  const norm = (status || '').toUpperCase();
  switch (norm) {
    case 'COMPLETED':
    case 'RESOLVED':
      return <span className="badge b-green">Completed</span>;
    case 'IN_PROGRESS':
    case 'IN PROGRESS':
      return <span className="badge b-purple">In Progress</span>;
    case 'ACCEPTED':
    case 'ASSIGNED':
      return <span className="badge b-blue">Staff Assigned</span>;
    case 'OFFERING':
    case 'OFFERED':
      return <span className="badge b-blue">Dispatching</span>;
    case 'CANCELLED':
    case 'DECLINED':
      return <span className="badge b-grey">{status}</span>;
    default:
      return <span className="badge b-amber">Requested</span>;
  }
};

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

export const RequestsPage: React.FC<RequestsPageProps> = ({
  requests,
  reservation,
  feedbackMap,
  isCheckedIn,
  onOpenServiceModal,
  onSubmitFeedback,
  onNavigate,
  onToast
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'in_progress' | 'completed'>('all');
  const [starRatings, setStarRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submittingFeedback, setSubmittingFeedback] = useState<Record<string, boolean>>({});

  const handleStarClick = (reqId: string, rating: number) => {
    setStarRatings((prev) => ({ ...prev, [reqId]: rating }));
  };

  const handleFeedbackSubmit = async (reqId: string) => {
    const rating = starRatings[reqId];
    if (!rating) {
      onToast('Please select a rating before submitting');
      return;
    }
    const comment = comments[reqId] || '';
    setSubmittingFeedback((prev) => ({ ...prev, [reqId]: true }));
    try {
      await onSubmitFeedback(reqId, rating, comment);
      onToast('Thank you! Your feedback has been recorded.');
    } catch {
      onToast('Could not submit feedback at this time');
    } finally {
      setSubmittingFeedback((prev) => ({ ...prev, [reqId]: false }));
    }
  };

  // Metrics computation
  const activeRequests = requests.filter((r) => {
    const norm = (r.status || '').toUpperCase();
    return norm === 'REQUESTED' || norm === 'OPEN' || norm === 'OFFERING' || norm === 'OFFERED' || norm === 'ACCEPTED';
  });

  const inProgressRequests = requests.filter((r) => {
    const norm = (r.status || '').toUpperCase();
    return norm === 'IN_PROGRESS' || norm === 'IN PROGRESS';
  });

  const completedRequests = requests.filter((r) => {
    const norm = (r.status || '').toUpperCase();
    return norm === 'COMPLETED' || norm === 'RESOLVED';
  });

  // Filtered list
  const filteredRequests = requests.filter((r) => {
    const norm = (r.status || '').toUpperCase();
    if (filter === 'active') {
      return norm === 'REQUESTED' || norm === 'OPEN' || norm === 'OFFERING' || norm === 'OFFERED' || norm === 'ACCEPTED';
    }
    if (filter === 'in_progress') {
      return norm === 'IN_PROGRESS' || norm === 'IN PROGRESS';
    }
    if (filter === 'completed') {
      return norm === 'COMPLETED' || norm === 'RESOLVED';
    }
    return true;
  });

  const roomDisplay = reservation?.roomNumber || (reservation?.roomId && typeof reservation.roomId === 'object' ? reservation.roomId.roomNumber : null);

  return (
    <div className="req-page-container">
      {/* Page Header */}
      <div className="req-header-row">
        <div>
          <span className="gold-sub">IN-HOUSE SERVICE DESK</span>
          <h1 style={{ margin: '4px 0 6px', fontSize: 'clamp(1.8rem, 4vw, 2.4rem)' }}>
            My Requests
          </h1>
          <p className="mute" style={{ margin: 0 }}>
            Track and manage your hotel service requests in real time.
          </p>
        </div>

        <div>
          <button
            type="button"
            className="btn gold"
            onClick={() => {
              if (!isCheckedIn) {
                onToast('Service requests unlock once reception checks you in.');
                return;
              }
              if (onOpenServiceModal) {
                onOpenServiceModal('Housekeeping', '');
              } else {
                onNavigate('services');
              }
            }}
          >
            + Request a Service
          </button>
        </div>
      </div>

      {/* Top Summary Metrics Cards */}
      <div className="req-summary-grid">
        <div
          className={`req-summary-card ${filter === 'active' ? 'active-filter' : ''}`}
          onClick={() => setFilter(filter === 'active' ? 'all' : 'active')}
        >
          <span className="req-sum-label">Pending / Offered</span>
          <b className="req-sum-val" style={{ color: 'var(--amber)' }}>
            {activeRequests.length}
          </b>
          <span className="req-sum-sub">Awaiting staff response</span>
        </div>

        <div
          className={`req-summary-card ${filter === 'in_progress' ? 'active-filter' : ''}`}
          onClick={() => setFilter(filter === 'in_progress' ? 'all' : 'in_progress')}
        >
          <span className="req-sum-label">In Progress</span>
          <b className="req-sum-val" style={{ color: 'var(--purple)' }}>
            {inProgressRequests.length}
          </b>
          <span className="req-sum-sub">Active staff execution</span>
        </div>

        <div
          className={`req-summary-card ${filter === 'completed' ? 'active-filter' : ''}`}
          onClick={() => setFilter(filter === 'completed' ? 'all' : 'completed')}
        >
          <span className="req-sum-label">Completed</span>
          <b className="req-sum-val" style={{ color: 'var(--green)' }}>
            {completedRequests.length}
          </b>
          <span className="req-sum-sub">Fulfilled during your stay</span>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="req-filter-bar">
        <div className="tabs" style={{ margin: 0 }}>
          <button
            type="button"
            className={filter === 'all' ? 'on' : ''}
            onClick={() => setFilter('all')}
          >
            All Requests ({requests.length})
          </button>
          <button
            type="button"
            className={filter === 'active' ? 'on' : ''}
            onClick={() => setFilter('active')}
          >
            Active ({activeRequests.length})
          </button>
          <button
            type="button"
            className={filter === 'in_progress' ? 'on' : ''}
            onClick={() => setFilter('in_progress')}
          >
            In Progress ({inProgressRequests.length})
          </button>
          <button
            type="button"
            className={filter === 'completed' ? 'on' : ''}
            onClick={() => setFilter('completed')}
          >
            Completed ({completedRequests.length})
          </button>
        </div>
      </div>

      {/* Request Cards List */}
      {filteredRequests.length > 0 ? (
        <div className="req-card-list">
          {filteredRequests.map((r) => {
            const isEmg = (r.priority || '').toUpperCase() === 'EMERGENCY' || r.dept?.toLowerCase() === 'emergency';
            const stepIdx = getStepIndex(r.status);
            const isCancelled = (r.status || '').toUpperCase() === 'CANCELLED' || (r.status || '').toUpperCase() === 'DECLINED';
            const fb = feedbackMap[r.id];
            const currentRating = starRatings[r.id] || 0;
            const icon = DEPT_ICONS[r.dept] || '🛎️';

            return (
              <article
                key={r.id}
                className={`card pad modern-req-card ${isEmg ? 'emergency-card' : ''}`}
              >
                {/* Card Header */}
                <div className="req-card-header">
                  <div className="req-card-dept">
                    <span className="req-dept-icon">{icon}</span>
                    <div>
                      <span className="req-dept-name">
                        {isEmg ? 'EMERGENCY DISPATCH' : r.dept.toUpperCase()}
                      </span>
                      <h3 className="req-card-title">{r.desc}</h3>
                    </div>
                  </div>

                  <div className="req-card-status">
                    {getStatusBadge(r.status)}
                    {r.priority === 'HIGH' && (
                      <span className="badge b-amber" style={{ marginLeft: '6px' }}>HIGH</span>
                    )}
                  </div>
                </div>

                {/* Card Meta Row */}
                <div className="req-card-meta">
                  {roomDisplay && (
                    <span className="req-meta-pill">Room {roomDisplay}</span>
                  )}
                  <span className="req-meta-id">Req #{r.id}</span>
                  <span className="req-meta-time">
                    {new Date(r.at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short'
                    })}{' '}
                    at{' '}
                    {new Date(r.at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {r.staff && (
                    <span className="req-meta-staff">
                      Assigned: <b>{r.staff}</b>
                    </span>
                  )}
                </div>

                {/* Status Stepper Progression */}
                {!isCancelled && (
                  <div className="req-stepper-box">
                    <div className="req-stepper-track">
                      {STEP_STAGES.map((stg, sIdx) => {
                        const isDone = sIdx <= stepIdx;
                        const isCurrent = sIdx === stepIdx;
                        return (
                          <div
                            key={stg.key}
                            className={`req-stepper-node ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
                          >
                            <div className="stepper-dot">
                              {isDone ? (sIdx < stepIdx ? '✓' : '●') : '○'}
                            </div>
                            <span className="stepper-label">{stg.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Interactive Feedback for Completed Requests */}
                {((r.status || '').toUpperCase() === 'COMPLETED' || (r.status || '').toUpperCase() === 'RESOLVED') && (
                  <div className="req-feedback-section">
                    {fb ? (
                      <div className="box ok" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.4rem' }}>★</span>
                        <div>
                          <b>Your Rating: {stars(fb.rating)}</b>
                          {fb.comment && <p style={{ margin: '2px 0 0', fontSize: '0.9rem' }}>"{fb.comment}"</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="req-feedback-form">
                        <div className="req-fb-prompt">
                          <b>How was your service experience?</b>
                          <span className="mute small">Help our hospitality team maintain excellence</span>
                        </div>

                        <div className="star-row">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              className={`star ${currentRating >= n ? 'on' : ''}`}
                              aria-label={`${n} stars`}
                              onClick={() => handleStarClick(r.id, n)}
                            >
                              ★
                            </button>
                          ))}
                        </div>

                        {currentRating > 0 && (
                          <div style={{ marginTop: '10px' }}>
                            <textarea
                              placeholder="Any comments or compliments for the staff? (Optional)"
                              rows={2}
                              value={comments[r.id] || ''}
                              onChange={(e) =>
                                setComments((prev) => ({ ...prev, [r.id]: e.target.value }))
                              }
                              className="svc-textarea"
                              style={{ minHeight: '68px', fontSize: '0.9rem' }}
                            />
                            <button
                              type="button"
                              className="btn gold sm"
                              style={{ marginTop: '8px' }}
                              onClick={() => handleFeedbackSubmit(r.id)}
                              disabled={submittingFeedback[r.id]}
                            >
                              {submittingFeedback[r.id] ? 'Submitting…' : 'Submit Feedback'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="card pad req-empty-state">
          <div className="req-empty-icon">🛎️</div>
          <h2 style={{ margin: '8px 0', fontSize: '1.6rem' }}>No service requests yet</h2>
          <p className="mute" style={{ maxWidth: '460px', margin: '0 auto 20px', lineHeight: 1.6 }}>
            Need something during your stay? Request housekeeping, maintenance, in-room food & beverage, or concierge assistance.
          </p>
          {isCheckedIn ? (
            <button
              type="button"
              className="btn gold"
              onClick={() => {
                if (onOpenServiceModal) {
                  onOpenServiceModal('Housekeeping', '');
                } else {
                  onNavigate('services');
                }
              }}
            >
              + Request a Service
            </button>
          ) : (
            <div className="box warn" style={{ maxWidth: '420px', margin: '0 auto' }}>
              Service requests are available after reception checks you into your room.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
