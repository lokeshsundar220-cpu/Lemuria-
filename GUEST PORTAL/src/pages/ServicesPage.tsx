import React from 'react';

interface ServicesPageProps {
  isCheckedIn: boolean;
  deptMap: Record<string, string[]>;
  onOpenServiceModal: (dept: string, item: string) => void;
  onNavigate: (route: string) => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({
  isCheckedIn,
  deptMap,
  onOpenServiceModal,
  onNavigate
}) => {
  if (!isCheckedIn) {
    return (
      <>
        <h2>Guest services</h2>
        <div className="locked">
          <b>🔒 Services locked</b>
          <br />
          <span className="small">Available after reception checks you in.</span>
        </div>
      </>
    );
  }

  return (
    <>
      <h2>Guest services</h2>
      <div className="grid">
        {Object.entries(deptMap).map(([dept, items]) => (
          <div key={dept} className="card pad">
            <h3>{dept}</h3>
            {items.map((item) => (
              <button
                key={item}
                className="btn ghost sm"
                style={{ color: 'var(--blue)', margin: '0 6px 8px 0' }}
                onClick={() => onOpenServiceModal(dept, item)}
              >
                {item}
              </button>
            ))}
          </div>
        ))}
      </div>
      <p style={{ marginTop: '20px' }}>
        <button
          type="button"
          style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          onClick={() => onNavigate('requests')}
        >
          View my requests
        </button>
      </p>
    </>
  );
};
