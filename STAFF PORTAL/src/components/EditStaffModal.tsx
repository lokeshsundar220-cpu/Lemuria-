import React, { useState } from 'react';

interface EditStaffModalProps {
  staff: {
    id: string;
    name: string;
    email: string;
    department: string;
    enabled: string;
  };
  busy: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    email: string;
    department: string;
    enabled: string;
  }) => void;
}

export const EditStaffModal: React.FC<EditStaffModalProps> = ({
  staff,
  busy,
  onClose,
  onSubmit
}) => {
  const [name, setName] = useState(staff.name);
  const [email, setEmail] = useState(staff.email);
  const [department, setDepartment] = useState(staff.department);
  const [enabled, setEnabled] = useState(staff.enabled);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      email: email.trim(),
      department,
      enabled
    });
  };

  return (
    <div className="ov">
      <div className="mod mod-lg">
        <h2 className="serif" style={{ fontSize: '20px', marginBottom: '14px', color: 'var(--gd)' }}>
          Edit Staff Profile: {staff.name}
        </h2>
        <form onSubmit={handleSubmit}>
          <label className="l">Staff ID (Locked)</label>
          <input value={staff.id} disabled style={{ opacity: 0.6 }} />

          <label className="l">Full Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label className="l">Email Address</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
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
            <option value="DELETED">DELETED</option>
          </select>

          <div className="row" style={{ marginTop: '20px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn gh" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn gd" disabled={busy}>
              {busy ? <span className="spinner"></span> : null}
              {busy ? ' Saving…' : 'UPDATE STAFF PROFILE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
