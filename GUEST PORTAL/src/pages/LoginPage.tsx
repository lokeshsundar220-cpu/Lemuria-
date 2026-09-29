import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onNavigate: (route: string) => void;
  onToast: (msg: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  onNavigate,
  onToast
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await onLogin(email.trim(), password);
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="split">
      <div className="hero" style={{ display: 'flex', alignItems: 'flex-end' }}>
        <svg viewBox="0 0 600 300" aria-hidden="true">
          <circle cx="420" cy="90" r="46" fill="#D4A84F" opacity=".85" />
          <path
            d="M0 300V190h60v-60h70v60h40v-90h90v90h50v-40h80v40h60v-70h100v170z"
            fill="#0a2540"
          />
          <path d="M0 300V230h600v70z" fill="#0d2f4d" />
        </svg>
        <div className="in">
          <p style={{ color: 'var(--gold)' }}>Welcome back</p>
          <h1 style={{ fontSize: '3rem' }}>Your stay starts here.</h1>
        </div>
      </div>
      <div style={{ padding: '32px 20px' }}>
        <div className="form">
          <h2>Guest sign in</h2>
          <form onSubmit={handleSubmit}>
            <label htmlFor="e">Email / Customer ID</label>
            <input
              id="e"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="p">Password</label>
            <input
              id="p"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <label style={{ display: 'flex', gap: '10px', alignItems: 'center', fontWeight: 400 }}>
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                style={{ width: '22px', minHeight: '22px' }}
              />
              Show password
            </label>

            <label style={{ display: 'flex', gap: '10px', alignItems: 'center', fontWeight: 400 }}>
              <input type="checkbox" defaultChecked style={{ width: '22px', minHeight: '22px' }} />
              Remember me
            </label>

            {error && <p className="box bad">{error}</p>}

            <button type="submit" className="btn block" style={{ marginTop: '12px' }}>
              Sign in
            </button>

            <div className="row" style={{ marginTop: '14px', justifyContent: 'space-between' }}>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
                onClick={() => onNavigate('register')}
              >
                Create account
              </button>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
                onClick={() => onToast('Password reset link sent to your email')}
              >
                Forgot password
              </button>
            </div>

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
              <p className="mute small" style={{ marginBottom: '8px' }}>Demo accounts:</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn sm ghost"
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  onClick={() => {
                    setEmail('s.malik@example.com');
                    setPassword('LemuriaGuest2026!');
                  }}
                >
                  Sanjay Malik (Grand)
                </button>
                <button
                  type="button"
                  className="btn sm ghost"
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  onClick={() => {
                    setEmail('r.verma@example.com');
                    setPassword('LemuriaGuest2026!');
                  }}
                >
                  Rahul Verma (Bay)
                </button>
                <button
                  type="button"
                  className="btn sm ghost"
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  onClick={() => {
                    setEmail('h.lindqvist@example.com');
                    setPassword('LemuriaGuest2026!');
                  }}
                >
                  Hanna Lindqvist (Hills)
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
