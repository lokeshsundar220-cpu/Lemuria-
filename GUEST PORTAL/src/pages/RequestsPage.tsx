import React, { useState } from 'react';

interface ServiceRequest {
  id: string;
  dept: string;
  desc: string;
  priority: string;
  status: string;
  at: number;
  staff?: string | null;
}

interface FeedbackEntry {
  rating: number;
  comment: string;
}

interface RequestsPageProps {
  requests: ServiceRequest[];
  feedbackMap: Record<string, FeedbackEntry>;
  isCheckedIn: boolean;
  onSubmitFeedback: (reqId: string, rating: number, comment: string) => Promise<void>;
  onNavigate: (route: string) => void;
  onToast: (msg: string) => void;
}

const RQ = ['REQUESTED', 'OFFERED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];
const RQL: Record<string, string> = {
  REQUESTED: 'Requested',
  OFFERED: 'Offering',
  ACCEPTED: 'Accepted',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

export const RequestsPage: React.FC<RequestsPageProps> = ({
  requests,
  feedbackMap,
  isCheckedIn,
  onSubmitFeedback,
  onNavigate,
  onToast
}) => {
  const [starRatings, setStarRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

  const handleStarClick = (reqId: string, rating: number) => {
    setStarRatings((prev) => ({ ...prev, [reqId]: rating }));
  };

  const handleFeedbackSubmit = async (reqId: string) => {
    const rating = starRatings[reqId];
    if (!rating) {
      onToast('Choose a star rating first');
      return;
    }
    const comment = comments[reqId] || '';
    try {
      await onSubmitFeedback(reqId, rating, comment);
      onToast('Feedback submitted');
    } catch {
      onToast('Could not send feedback');
    }
  };

  const getBadgeClass = (status: string) => {
    if (status === 'COMPLETED') return 'b-green';
    if (status === 'CANCELLED') return 'b-grey';
    if (status === 'REQUESTED') return 'b-amber';
    return 'b-blue';
  };

  return (
    <>
      <h2>My requests</h2>
      {requests.length > 0 ? (
        <div className="grid">
          {requests.map((r) => {
            const stepIndex = RQ.indexOf(r.status);
            const isEmg = r.priority === 'EMERGENCY';
            const fb = feedbackMap[r.id];
            const currentRating = starRatings[r.id] || 0;

            return (
              <article
                key={r.id}
                className={`card pad rq ${isEmg ? 'emergency' : ''}`}
              >
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <b>
                    {isEmg ? '🚨 Emergency · ' : ''}
                    {r.id}
                  </b>
                  <span className={`badge ${getBadgeClass(r.status)}`}>
                    {RQL[r.status] || r.status}
                  </span>
                </div>

                <p className="mute small" style={{ margin: '6px 0' }}>
                  {r.dept} ·{' '}
                  {new Date(r.at).toLocaleString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: 'numeric',
                    month: 'short'
                  })}
                  {r.staff ? ` · ${r.staff}` : ''}
                </p>

                <p>{r.desc}</p>

                {r.status !== 'CANCELLED' && (
                  <div className="steps">
                    {RQ.map((_, k) => (
                      <i key={k} className={k <= stepIndex ? 'd' : ''} />
                    ))}
                  </div>
                )}

                {r.status === 'COMPLETED' && (
                  <div style={{ marginTop: '14px' }}>
                    {fb ? (
                      <p className="ok box">Your rating: {stars(fb.rating)}</p>
                    ) : (
                      <div className="form">
                        <h3>How was this service?</h3>
                        <div>
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
                        <label htmlFor={`c-${r.id}`}>Comment</label>
                        <textarea
                          id={`c-${r.id}`}
                          maxLength={500}
                          value={comments[r.id] || ''}
                          onChange={(e) =>
                            setComments((prev) => ({ ...prev, [r.id]: e.target.value }))
                          }
                        />
                        <button
                          type="button"
                          className="btn"
                          style={{ marginTop: '12px' }}
                          onClick={() => handleFeedbackSubmit(r.id)}
                        >
                          Submit feedback
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card center">
          <div className="ic">✦</div>
          <h3>No requests</h3>
          <p className="mute">You haven't made any service requests yet.</p>
          {isCheckedIn && (
            <button className="btn" onClick={() => onNavigate('services')}>
              Request a service
            </button>
          )}
        </div>
      )}
    </>
  );
};
