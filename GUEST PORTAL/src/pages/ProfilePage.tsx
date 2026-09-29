import React from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
}

interface ProfilePageProps {
  user: User;
  onToast: (msg: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onToast }) => {
  const initial = (user.name[0] || 'G').toUpperCase();
  const maskedMobile = user.mobile ? `••••${user.mobile.slice(-4)}` : 'No mobile added';

  return (
    <>
      <h2>Profile</h2>
      <div className="card pad form">
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'var(--navy)',
            color: 'var(--gold)',
            display: 'grid',
            placeItems: 'center',
            font: '600 2rem var(--serif)'
          }}
        >
          {initial}
        </div>
        <p style={{ marginTop: '12px' }}>
          <b>{user.name}</b>
        </p>
        <p className="mute small">
          Customer ID: {user.id}
          <br />
          {user.email}
          <br />
          {maskedMobile}
        </p>

        <h3>Security</h3>
        <button
          className="btn ghost sm"
          style={{ color: 'var(--blue)' }}
          onClick={() => onToast('Password change will be available with the backend')}
        >
          Change password
        </button>

        <h3 style={{ marginTop: '20px' }}>Notification preferences</h3>
        <label style={{ display: 'flex', gap: '10px', alignItems: 'center', fontWeight: 400 }}>
          <input type="checkbox" defaultChecked style={{ width: '22px', minHeight: '22px' }} />
          Email updates
        </label>
        <label style={{ display: 'flex', gap: '10px', alignItems: 'center', fontWeight: 400 }}>
          <input type="checkbox" defaultChecked style={{ width: '22px', minHeight: '22px' }} />
          Stay and request alerts
        </label>
      </div>
    </>
  );
};
