import React from 'react';

interface ServicesPageProps {
  isCheckedIn: boolean;
  deptMap: Record<string, string[]>;
  onOpenServiceModal: (dept: string, item: string) => void;
  onNavigate: (route: string) => void;
}

const DEPT_ICONS: Record<string, string> = {
  Housekeeping: '🧹',
  Maintenance: '🔧',
  'Food & Beverage': '🍽️',
  Concierge: '🛎️'
};

const DEPT_DESCS: Record<string, string> = {
  Housekeeping: 'Daily cleaning, fresh linens, extra bath towels, and essential luxury toiletries.',
  Maintenance: 'Room climate control, lighting, plumbing fixtures, electrical and smart TV support.',
  'Food & Beverage': 'Chef-crafted in-room breakfast, gourmet dining, refreshments and beverage service.',
  Concierge: 'Luggage transport, city taxi transfers, wake-up calls and bespoke travel arrangements.'
};

export const ServicesPage: React.FC<ServicesPageProps> = ({
  isCheckedIn,
  deptMap,
  onOpenServiceModal,
  onNavigate
}) => {
  if (!isCheckedIn) {
    return (
      <div className="dash-container">
        <div className="card pad center" style={{ marginTop: '30px' }}>
          <span style={{ fontSize: '3rem' }}>🔒</span>
          <h2 style={{ margin: '12px 0 6px' }}>Guest Services Locked</h2>
          <p className="mute" style={{ maxWidth: '440px', margin: '0 auto 20px' }}>
            In-room amenities and operations unlock once you complete arrival verification at reception.
          </p>
          <button type="button" className="btn gold" onClick={() => onNavigate('dashboard')}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-container">
      <div className="req-header-row">
        <div>
          <span className="gold-sub">IN-ROOM HOSPITALITY</span>
          <h1 style={{ margin: '4px 0 6px', fontSize: 'clamp(1.8rem, 4vw, 2.4rem)' }}>
            Guest Services Directory
          </h1>
          <p className="mute" style={{ margin: 0 }}>
            Select a service below to submit an operational request directly to on-duty hotel staff.
          </p>
        </div>

        <button
          type="button"
          className="btn ghost sm"
          style={{ color: 'var(--blue)' }}
          onClick={() => onNavigate('requests')}
        >
          Track My Requests →
        </button>
      </div>

      <div className="services-full-grid" style={{ marginTop: '24px' }}>
        {Object.entries(deptMap).map(([dept, items]) => (
          <div key={dept} className="card pad svc-detail-card">
            <div className="svc-detail-head">
              <span className="svc-cat-icon">{DEPT_ICONS[dept] || '🛎️'}</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{dept}</h2>
                <p className="mute small" style={{ margin: '2px 0 0' }}>
                  {DEPT_DESCS[dept] || 'Hospitality assistance on demand'}
                </p>
              </div>
            </div>

            <div className="svc-items-wrapper">
              <span className="svc-items-title">Popular requests:</span>
              <div className="svc-chips">
                {items.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="svc-chip"
                    onClick={() => onOpenServiceModal(dept, item)}
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="btn gold sm"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={() => onOpenServiceModal(dept, '')}
            >
              Custom {dept} Request →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
