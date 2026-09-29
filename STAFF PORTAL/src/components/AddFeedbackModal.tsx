import React, { useState } from 'react';

interface AddFeedbackModalProps {
  rooms: { id: string }[];
  staffList: { id: string; name: string; department: string; enabled: string }[];
  deptMap: Record<string, string>;
  busy: boolean;
  onClose: () => void;
  onSubmit: (data: {
    category: string;
    serviceType: string;
    guest: string;
    resId: string;
    room: string;
    taskName: string;
    staffId: string | null;
    rating: number;
    message: string;
  }) => void;
}

export const AddFeedbackModal: React.FC<AddFeedbackModalProps> = ({
  rooms,
  staffList,
  deptMap,
  busy,
  onClose,
  onSubmit
}) => {
  const [category, setCategory] = useState<'SERVICE' | 'OVERALL'>('SERVICE');
  const [guest, setGuest] = useState('');
  const [resId] = useState(() => `RSV-${Math.floor(10000 + Math.random() * 90000)}`);
  const [room, setRoom] = useState(rooms[0]?.id || '201');
  const [serviceDept, setServiceDept] = useState('housekeeping');
  const [taskName, setTaskName] = useState('');
  const [staffId, setStaffId] = useState('');
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');

  const isService = category === 'SERVICE';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      category,
      serviceType: isService ? serviceDept : 'overall',
      guest: guest.trim(),
      resId,
      room,
      taskName: isService ? taskName.trim() : 'Overall Luxury Stay Experience',
      staffId: isService && staffId ? staffId : null,
      rating: Number(rating),
      message: message.trim()
    });
  };

  return (
    <div className="ov">
      <div className="mod mod-lg">
        <h2 className="serif" style={{ fontSize: '20px', marginBottom: '14px', color: 'var(--gd)' }}>
          ＋ Record Guest Feedback
        </h2>
        <form onSubmit={handleSubmit}>
          <label className="l">Feedback Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as 'SERVICE' | 'OVERALL')}
          >
            <option value="SERVICE">Service / Request Feedback (Specific service or task)</option>
            <option value="OVERALL">Overall Hotel Stay Feedback (Entire stay experience)</option>
          </select>

          <label className="l">Guest Name</label>
          <input
            value={guest}
            onChange={(e) => setGuest(e.target.value)}
            required
            placeholder="e.g. Countess Vivienne"
          />

          <div className="grid g2">
            <div>
              <label className="l">Reservation Reference</label>
              <input value={resId} readOnly required />
            </div>
            <div>
              <label className="l">Guest Room</label>
              <select value={room} onChange={(e) => setRoom(e.target.value)}>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isService ? (
            <>
              <label className="l">Service Department</label>
              <select value={serviceDept} onChange={(e) => setServiceDept(e.target.value)}>
                <option value="housekeeping">Housekeeping</option>
                <option value="maintenance">Maintenance</option>
                <option value="fnb">Food & Beverage</option>
                <option value="reception">Reception / Front Desk</option>
              </select>

              <label className="l">Service / Task Name</label>
              <input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="e.g. Suite Cleaning, Dinner Order, AC Repair, Welcome Check-in"
                required
              />

              <label className="l">Staff Member Involved (Optional)</label>
              <select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                <option value="">Lemuria Operations Team</option>
                {staffList
                  .filter((s) => s.enabled === 'ENABLED')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id} · {deptMap[s.department]})
                    </option>
                  ))}
              </select>
            </>
          ) : null}

          <label className="l">Rating (1 to 5 Stars)</label>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            <option value="5">★★★★★ — 5 Stars (Exceptional)</option>
            <option value="4">★★★★☆ — 4 Stars (Very Good)</option>
            <option value="3">★★★☆☆ — 3 Stars (Average)</option>
            <option value="2">★★☆☆☆ — 2 Stars (Needs Improvement)</option>
            <option value="1">★☆☆☆☆ — 1 Star (Unsatisfactory)</option>
          </select>

          <label className="l">Guest Feedback Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            placeholder="Share the guest's detailed impressions, compliments or feedback…"
          />

          <div className="row" style={{ marginTop: '20px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn gh" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn gd" disabled={busy}>
              {busy ? <span className="spinner"></span> : null}
              {busy ? ' Saving…' : 'SUBMIT GUEST FEEDBACK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
