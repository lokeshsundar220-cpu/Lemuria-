import React, { useState } from 'react';

interface RegisterPageProps {
  onRegister: (data: { name: string; email: string; mobile: string }) => Promise<void>;
  onNavigate: (route: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onRegister, onNavigate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Enter your full name.');
    if (!/\S+@\S+\.\S+/.test(email.trim())) return setError('Enter a valid email.');
    if (mobile.trim().length < 8) return setError('Enter a valid mobile number.');
    if (password.length < 8) return setError('Password needs 8+ characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    if (!agreeTerms) return setError('Accept the terms to continue.');

    try {
      await onRegister({
        name: name.trim(),
        email: email.trim(),
        mobile: mobile.trim()
      });
      onNavigate('verify-otp');
    } catch {
      setError('Could not create your account. Try again.');
    }
  };

  return (
    <div className="form">
      <h2>Create your account</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="n">Full name</label>
        <input
          id="n"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label htmlFor="e">Email</label>
        <input
          id="e"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="m">Mobile number</label>
        <input
          id="m"
          type="tel"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
        />

        <label htmlFor="p">Password</label>
        <input
          id="p"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <label htmlFor="p2">Confirm password</label>
        <input
          id="p2"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <label style={{ display: 'flex', gap: '10px', alignItems: 'center', fontWeight: 400 }}>
          <input
            id="t"
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            style={{ width: '22px', minHeight: '22px' }}
          />
          I accept the terms and privacy policy
        </label>

        {error && <p className="box bad">{error}</p>}

        <button type="submit" className="btn block" style={{ marginTop: '12px' }}>
          Create account
        </button>

        <p className="small" style={{ marginTop: '12px' }}>
          Have an account?{' '}
          <button
            type="button"
            style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', padding: 0 }}
            onClick={() => onNavigate('login')}
          >
            Sign in
          </button>
        </p>
      </form>
    </div>
  );
};
