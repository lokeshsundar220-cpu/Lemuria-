import React, { useEffect, useRef } from 'react';

interface LandingPageProps {
  onPickDepartment: (dept: string) => void;
}

const ROLES: [string, string, string, string, string][] = [
  ['reception', '🛎️', 'Reception', 'Arrivals, key verification, guest check-in/out, and live room states.', 'FRONT DESK'],
  ['housekeeping', '🧹', 'Housekeeping', 'Live task offers, room cleanings, and photo proof inspection.', 'ROOMS & SUITES'],
  ['maintenance', '🔧', 'Maintenance', 'Rapid repairs, facility technician dispatch, and emergency alerts.', 'FACILITIES'],
  ['fnb', '🍽️', 'Food & Beverage', 'In-room dining orders, VIP service delivery, and minibar restocking.', 'DINING & BAR'],
  ['manager', '👑', 'General Manager', 'Executive command center, staff administration, and customer feedback.', 'COMMAND']
];

export const LandingPage: React.FC<LandingPageProps> = ({ onPickDepartment }) => {
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!statsRef.current) return;
    const elements = statsRef.current.querySelectorAll<HTMLElement>('[data-c]');
    elements.forEach((e) => {
      const target = parseFloat(e.dataset.c || e.textContent || '0');
      if (isNaN(target)) return;
      const t0 = performance.now();
      const frame = (now: number) => {
        const progress = Math.min(1, (now - t0) / 750);
        e.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3))).toString();
        if (progress < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  // Generate 24 random background particles
  const particles = Array.from({ length: 24 }, (_, i) => {
    const left = `${(i * 4.2 + (i % 7) * 3) % 100}%`;
    const size = `${2 + (i % 4)}px`;
    const duration = `${8 + (i % 12)}s`;
    const delay = `-${(i % 14)}s`;
    return (
      <i
        key={i}
        className="pt"
        style={{
          left,
          width: size,
          height: size,
          animationDuration: duration,
          animationDelay: delay
        }}
      />
    );
  });

  return (
    <div className="land">
      <div className="orb o1"></div>
      <div className="orb o2"></div>
      <div className="orb o3"></div>
      <div className="lgrid"></div>
      {particles}
      <div className="lc">
        <div className="lb">
          {Array.from('LEMURIA').map((char, index) => (
            <span
              key={index}
              style={{
                animationDelay: `${index * 0.08}s, ${1.4 + index * 0.08}s`
              }}
            >
              {char}
            </span>
          ))}
        </div>
        <div className="ls">HOTEL OPERATIONS COMMAND</div>
        <p className="type">The unified command center behind every extraordinary stay.</p>
        <div className="stats" ref={statsRef}>
          <div>
            <b data-c="5">5</b>
            <span>Workspaces</span>
          </div>
          <div>
            <b data-c="15">15</b>
            <span>Sec Offer Window</span>
          </div>
          <div>
            <b data-c="24">24</b>
            <span>Hour Operations</span>
          </div>
        </div>
        <h2 className="pick">Select Your Operational Department</h2>
        <div className="rg">
          {ROLES.map(([id, icon, title, desc, tag], i) => (
            <button
              key={id}
              className="rc"
              style={{ animationDelay: `${0.9 + i * 0.12}s` }}
              onMouseMove={handleMouseMove}
              onClick={() => onPickDepartment(id)}
            >
              <div style={{ fontSize: '36px' }}>{icon}</div>
              <small>{tag}</small>
              <h3>{title}</h3>
              <p>{desc}</p>
              <span className="go">Enter workspace →</span>
            </button>
          ))}
        </div>
        <div className="lf">
          <span className="on-dot"></span>Lemuria Grand Hotel Operational Network · Enterprise Access
        </div>
      </div>
    </div>
  );
};
