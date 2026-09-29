import React, { useState } from 'react';

interface AddStaffModalProps {
  busy: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    id?: string;
    email?: string;
    department: string;
    enabled: string;
  }) => void;
}

export const AddStaffModal: React.FC<AddStaffModalProps> = ({ busy, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('housekeeping');
  const [enabled, setEnabled] = useState('ENABLED');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      id: id.trim() || undefined,
      email: email.trim() || undefined,
      department,
      enabled
    });
  };

  return (
    <div className="ov">
      <div className="mod mod-lg">
        <h2 className="serif" style={{ fontSize: '20px', marginBottom: '14px', color: 'var(--gd)' }}>
          ＋ Add New Staff Member
        </h2>
        <form onSubmit={handleSubmit}>
          <label className="l">Full Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Victoria Sterling"
          />

          <label className="l">Staff ID (Optional - auto-generated if blank)</label>
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="e.g. RC-003"
          />

          <label className="l">Email Address (Optional)</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="e.g. victoria.sterling@lemuria.com"
          />

          <label className="l">Department</label>
          <select value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="reception">Reception</option>
            <option value="housekeeping">Housekeeping</option>
            <option value="maintenance">Maintenance</option>
            <option value="fnb">Food & Beverage</option>
            <option value="manager">Manager</option>
          </select>

          <label className="l">Account Status</label>
          <select value={enabled} onChange={(e) => setEnabled(e.target.value)}>
            <option value="ENABLED">ENABLED (Active)</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="DISABLED">DISABLED</option>
          </select>

          <div className="row" style={{ marginTop: '20px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn gh" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn gd" disabled={busy}>
              {busy ? <span className="spinner"></span> : null}
              {busy ? ' Creating…' : 'SAVE STAFF MEMBER'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
