import React, { useState, useEffect, useRef } from 'react';

interface VerifyOtpPageProps {
  pendingEmail: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => void;
  onNavigate: (route: string) => void;
}

export const VerifyOtpPage: React.FC<VerifyOtpPageProps> = ({
  pendingEmail,
  onVerify,
  onResend,
  onNavigate
}) => {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const maskedEmail = pendingEmail
    ? pendingEmail.replace(/^(.).*(@.*)$/, '$1•••••$2')
    : 'your email';

  // Timer countdown
  useEffect(() => {
    if (isSuccess) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSuccess]);

  // Initial focus
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const triggerShake = (msg: string) => {
    setError(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 450);
  };

  const handleVerify = async (code: string) => {
    if (loading || isSuccess) return;
    if (code.length < 6) {
      triggerShake('Enter all 6 digits.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onVerify(code);
      setIsSuccess(true);
      setTimeout(() => {
        onNavigate('dashboard');
      }, 1600);
    } catch (err: unknown) {
      setLoading(false);
      triggerShake((err as Error).message);
    }
  };

  const handleChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    const newDigits = [...digits];
    newDigits[index] = clean.slice(-1);
    setDigits(newDigits);

    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = newDigits.join('');
    if (fullCode.length === 6) {
      handleVerify(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      e.preventDefault();
      const newDigits = [...digits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setDigits(newDigits);
      if (pasted.length === 6) {
        handleVerify(pasted);
      }
    }
  };

  const handleResendClick = () => {
    if (countdown > 0) return;
    setCountdown(60);
    onResend();
  };

  const ringOffset = 126 * (1 - countdown / 60);

  return (
    <div className="vscene">
      <i className="orb o1"></i>
      <i className="orb o2"></i>
      {Array.from({ length: 14 }, (_, k) => (
        <b
          key={k}
          className="pt"
          style={{
            left: `${(k * 73) % 100}%`,
            animationDelay: `${(k % 7) * 0.8}s`,
            animationDuration: `${8 + (k % 5) * 2}s`
          }}
        />
      ))}

      <div className="vcard" id="vc">
        {isSuccess ? (
          <>
            <div className="vok">
              <svg viewBox="0 0 110 110" aria-hidden="true">
                <circle
                  className="c"
                  cx="55"
                  cy="55"
                  r="48"
                  fill="rgba(16,185,129,.15)"
                  stroke="#10B981"
                  strokeWidth="4"
                  transform="rotate(-90 55 55)"
                />
                <path
                  className="k"
                  d="M34 57l15 15 28-32"
                  fill="none"
                  stroke="#F2D186"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2>Email verified</h2>
            <p>Welcome to Lemuria. Taking you in…</p>
          </>
        ) : (
          <>
            <div className="env">
              <svg viewBox="0 0 104 104" aria-hidden="true">
                <defs>
                  <linearGradient id="eg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#F2D186" />
                    <stop offset="1" stopColor="#D4A84F" />
                  </linearGradient>
                </defs>
                <circle cx="52" cy="52" r="50" fill="#071A2B" stroke="url(#eg)" strokeWidth="2" />
                <rect x="26" y="36" width="52" height="36" rx="6" fill="url(#eg)" />
                <path
                  d="M26 42l26 18 26-18"
                  fill="none"
                  stroke="#071A2B"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                <g className="fl">
                  <path
                    d="M26 40l26 17 26-17"
                    fill="none"
                    stroke="#fff"
                    strokeOpacity=".55"
                    strokeWidth="2"
                  />
                </g>
                <circle cx="76" cy="34" r="8" fill="#10B981" stroke="#071A2B" strokeWidth="3" />
              </svg>
            </div>

            <h2>Verify your email</h2>
            <p>
              We sent a verification code to <b>{maskedEmail}</b>.
            </p>

            <div className={`otp ${isShaking ? 'shake' : ''}`}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  aria-label={`Digit ${i + 1}`}
                  className={d ? 'f' : ''}
                  value={d}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                />
              ))}
            </div>

            {error && (
              <p className="box bad" role="alert">
                {error}
              </p>
            )}

            <button
              className={`btn vbtn block ${loading ? 'load' : ''}`}
              disabled={loading}
              onClick={() => handleVerify(digits.join(''))}
            >
              Verify email
            </button>

            <div className="vrs">
              <svg className="ring" viewBox="0 0 46 46" aria-hidden="true">
                <circle className="tr" cx="23" cy="23" r="20" />
                <circle
                  className="pg"
                  cx="23"
                  cy="23"
                  r="20"
                  style={{ strokeDashoffset: ringOffset }}
                />
              </svg>
              <div style={{ textAlign: 'left' }}>
                <span className="small" style={{ color: '#cbd6e2' }}>
                  {countdown > 0 ? `Resend available in ${countdown} seconds.` : "Didn't get it?"}
                </span>
                <br />
                <button disabled={countdown > 0} onClick={handleResendClick}>
                  Resend code
                </button>
              </div>
            </div>

            <p className="small" style={{ margin: '14px 0 0' }}>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#9fb1c3', cursor: 'pointer' }}
                onClick={() => onNavigate('register')}
              >
                Use a different email
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};
