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
  const deptStaff = staffList.filter((x) => x.department.toLowerCase() === department.toLowerCase());
  const defaultStaff = deptStaff[0] || { id: department === 'manager' ? 'GRD-MG-001' : 'GRD-HK-001' };

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
            style={{ fontSize: '11.5px', marginTop: '16px', textAlign: 'center', lineHeight: 1.5 }}
          >
            Demo credentials for {deptName}:<br />
            {deptStaff.length > 0 ? (
              deptStaff.map((s, idx) => (
                <React.Fragment key={s.id}>
                  {idx > 0 ? ' · ' : ''}
                  <code
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSid(s.id)}
                    title="Click to fill"
                  >
                    {s.id}
                  </code>{' '}
                  ({s.enabled})
                </React.Fragment>
              ))
            ) : (
              <code>GRD-{department.toUpperCase().slice(0, 2)}-001</code>
            )}
            <br />
            Standard Password: <code>Password123!</code>
          </div>
        </div>
      </div>
    </div>
  );
};
