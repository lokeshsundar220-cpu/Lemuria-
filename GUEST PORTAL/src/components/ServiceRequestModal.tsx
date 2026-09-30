import React, { useState } from 'react';

interface ServiceRequestModalProps {
  initialDept: string;
  initialItem?: string;
  roomNumber?: string | null;
  deptMap: Record<string, string[]>;
  onClose: () => void;
  onSubmit: (dept: string, desc: string, priority: string) => void;
}

const DEPT_ICONS: Record<string, string> = {
  Housekeeping: '🧹',
  Maintenance: '🔧',
  'Food & Beverage': '🍽️',
  Concierge: '🛎️'
};

const PLACEHOLDERS: Record<string, string> = {
  Housekeeping: 'Example: Please clean my room and provide 2 fresh bath towels.',
  Maintenance: 'Example: The AC is not cooling properly, please inspect.',
  'Food & Beverage': 'Example: I would like to order breakfast for 2 (continental with coffee).',
  Concierge: 'Example: Please arrange a taxi to the airport for 4:00 PM.'
};

export const ServiceRequestModal: React.FC<ServiceRequestModalProps> = ({
  initialDept,
  initialItem = '',
  roomNumber,
  deptMap,
  onClose,
  onSubmit
}) => {
  const depts = Object.keys(deptMap);
  const [dept, setDept] = useState(initialDept || depts[0]);
  const [desc, setDesc] = useState(initialItem ? `${initialItem}: ` : '');
  const [priority, setPriority] = useState('NORMAL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChipClick = (item: string) => {
    if (!desc || desc.trim().length === 0) {
      setDesc(`${item}: `);
    } else if (!desc.includes(item)) {
      setDesc((prev) => `${prev.trim()}\n${item}: `);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (desc.trim().length < 3) return;
    setIsSubmitting(true);
    onSubmit(dept, desc.trim(), priority);
  };

  const currentChips = deptMap[dept] || [];
  const currentPlaceholder = PLACEHOLDERS[dept] || 'Tell us what you need for your stay...';

  return (
    <div
      className="ov"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="md svc-modal">
        <div className="svc-modal-head">
          <div>
            <span className="gold-sub">LEMURIA GUEST SERVICES</span>
            <h2 style={{ margin: '4px 0 0', fontSize: '1.6rem' }}>
              {DEPT_ICONS[dept] || '🛎️'} Request {dept}
            </h2>
          </div>
          <button
            type="button"
            className="svc-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
          {/* Department Selector */}
          <label style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--mute)' }}>
            Service Category
          </label>
          <div className="svc-dept-tabs">
            {depts.map((d) => (
              <button
                key={d}
                type="button"
                className={`svc-dept-tab ${dept === d ? 'active' : ''}`}
                onClick={() => {
                  setDept(d);
                  if (!desc || initialItem) {
                    setDesc('');
                  }
                }}
              >
                <span>{DEPT_ICONS[d]}</span>
                <b>{d}</b>
              </button>
            ))}
          </div>

          {/* Quick Item Suggestion Chips */}
          {currentChips.length > 0 && (
            <div style={{ margin: '14px 0 6px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--mute)', display: 'block', marginBottom: '6px' }}>
                Quick suggestions:
              </span>
              <div className="svc-chips">
                {currentChips.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="svc-chip"
                    onClick={() => handleChipClick(item)}
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Request Description */}
          <label htmlFor="svc-desc" style={{ marginTop: '12px' }}>
            Request Details <span style={{ color: 'var(--gold)' }}>*</span>
          </label>
          <textarea
            id="svc-desc"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder={currentPlaceholder}
            required
            rows={4}
            className="svc-textarea"
            autoFocus
          />

          {/* Room and Priority Meta Row */}
          <div className="svc-meta-row">
            <div className="svc-meta-item">
              <span className="svc-meta-label">Destination</span>
              <span className="svc-meta-val">
                {roomNumber ? `Room ${roomNumber}` : 'Current In-House Stay'}
              </span>
            </div>

            <div className="svc-meta-item" style={{ flex: '1 1 140px' }}>
              <label htmlFor="svc-priority" style={{ margin: 0, fontSize: '0.78rem', color: 'var(--mute)' }}>
                Urgency
              </label>
              <select
                id="svc-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="svc-select"
              >
                <option value="NORMAL">Normal Priority</option>
                <option value="HIGH">High Priority</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="svc-modal-actions">
            <button
              type="button"
              className="btn ghost"
              style={{ color: 'var(--ink)' }}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn gold"
              disabled={desc.trim().length < 3 || isSubmitting}
              style={{ minWidth: '150px' }}
            >
              {isSubmitting ? 'Sending Request…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
