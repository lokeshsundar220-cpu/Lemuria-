import React, { useState } from 'react';
import { Pill } from '../components/Pill';

interface LoginPageProps {
  department: string;
  deptName: string;
  staffList: { id: string; name: string; department: string; enabled: string }[];
  busy: boolean;
  busyMsg: string;
  loginErr: string;
  onLogin: (sid: string, pw: string) => void;
  onBack: () => void;
}

interface DemoPreset {
  id: string;
  name: string;
  hotel: string;
}

const DEMO_STAFF_MAP: Record<string, DemoPreset[]> = {
  housekeeping: [
    { id: 'HIL-HK-001', name: 'Kavitha Raman', hotel: 'Hills Resort (Ooty Demo)' },
    { id: 'GRD-HK-001', name: 'Priya Nair', hotel: 'Grand Hotel (Goa)' }
  ],
  maintenance: [
    { id: 'HIL-MT-001', name: 'Bala Murugan', hotel: 'Hills Resort (Ooty Demo)' },
    { id: 'GRD-MT-001', name: 'Vikram Singh', hotel: 'Grand Hotel (Goa)' }
  ],
  fnb: [
    { id: 'HIL-FB-001', name: 'Divya Krishnan', hotel: 'Hills Resort (Ooty Demo)' },
    { id: 'GRD-FB-001', name: 'Rohan Mehra', hotel: 'Grand Hotel (Goa)' }
  ],
  reception: [
    { id: 'HIL-RC-001', name: 'Lakshmi Iyer', hotel: 'Hills Resort (Ooty Demo)' },
    { id: 'GRD-RC-001', name: 'Ananya Desai', hotel: 'Grand Hotel (Goa)' }
  ],
  manager: [
    { id: 'HIL-MG-001', name: 'Ganesh Subramanian', hotel: 'Hills Resort (Ooty Demo)' },
    { id: 'GRD-MG-001', name: 'Rajesh Sharma', hotel: 'Grand Hotel (Goa)' }
  ]
};

export const LoginPage: React.FC<LoginPageProps> = ({
  department,
  deptName,
  staffList,
  busy,
  busyMsg,
  loginErr,
  onLogin,
  onBack
}) => {
  const normDept = department.toLowerCase();
  const presets = DEMO_STAFF_MAP[normDept] || [];
  const deptStaff = staffList.filter((x) => x.department.toLowerCase() === normDept);
  const defaultStaff = deptStaff[0] || presets[0] || { id: normDept === 'manager' ? 'HIL-MG-001' : 'HIL-HK-001' };

  const [sid, setSid] = useState('');
  const [pw, setPw] = useState('Password123!');
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(sid || defaultStaff.id, pw);
  };

  return (
    <div className="login">
      <div className="lh">
        <div className="brand" style={{ fontSize: '36px', padding: 0 }}>
          LEMURIA<small>HOTEL OPERATIONS PLATFORM</small>
        </div>
        <h1 className="serif" style={{ fontSize: '30px', margin: '28px 0 10px', lineHeight: 1.2 }}>
          Operational Command Center
        </h1>
        <p style={{ maxWidth: '440px', color: '#b5c7db', fontSize: '15px', lineHeight: 1.6 }}>
          Coordinate five-star hotel operations, staff dispatching, guest arrivals, and feedback from
          one unified console.
        </p>
        <div style={{ marginTop: '30px' }}>
          <button className="btn gh sm" onClick={onBack}>
            ← Return to Workspace Portal
          </button>
        </div>
      </div>

      <div className="lr">
        <div className="card">
          <div className="row bt">
            <b style={{ letterSpacing: '2px', fontSize: '13px' }}>SECURE STAFF WORKSPACE</b>
            <Pill label="SYSTEM ONLINE" />
          </div>
          <div style={{ margin: '14px 0 10px' }}>
            <Pill label={`${deptName} Workspace`} colorVar="--gd" />
          </div>

          {loginErr ? <div className="login-err">⚠ {loginErr}</div> : null}

          <form onSubmit={handleSubmit}>
            <label className="l">Email or Staff ID</label>
            <input
              name="sid"
              autoComplete="username"
              placeholder={`e.g. ${defaultStaff.id}`}
              value={sid}
              onChange={(e) => setSid(e.target.value)}
              required
            />

            <label className="l">Password</label>
            <input
              name="pw"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
            />

            <div className="row bt" style={{ margin: '14px 0', fontSize: '13px' }}>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={showPw}
                  onChange={(e) => setShowPw(e.target.checked)}
                />{' '}
                Show password
              </label>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="checkbox" style={{ width: 'auto' }} defaultChecked /> Remember workspace
              </label>
            </div>

            <button
              type="submit"
              className="btn gd"
              style={{ width: '100%', padding: '12px', fontSize: '14px' }}
              disabled={busy}
            >
              {busy ? (
                <>
                  <span className="spinner"></span> {busyMsg || 'Authenticating…'}
                </>
              ) : (
                'SIGN IN TO WORKSPACE'
              )}
            </button>
          </form>

          <div
            className="mu"
            style={{ fontSize: '12px', marginTop: '16px', textAlign: 'center', lineHeight: 1.6 }}
          >
            <div style={{ fontWeight: 600, color: 'var(--gd)', marginBottom: '4px' }}>
              Select Demo Staff Profile for {deptName}:
            </div>
            {presets.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '8px 0' }}>
                {presets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="btn sm gh"
                    style={{
                      justifyContent: 'space-between',
                      padding: '6px 12px',
                      fontSize: '12px',
                      borderColor: sid === p.id ? 'var(--gd)' : 'var(--ln)'
                    }}
                    onClick={() => setSid(p.id)}
                  >
                    <span><b>{p.id}</b> · {p.name}</span>
                    <span style={{ fontSize: '11px', opacity: 0.8 }}>{p.hotel}</span>
                  </button>
                ))}
              </div>
            ) : (
              <code>HIL-{department.toUpperCase().slice(0, 2)}-001</code>
            )}
            <div style={{ fontSize: '11px', marginTop: '4px' }}>
              Standard Password: <code>Password123!</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
