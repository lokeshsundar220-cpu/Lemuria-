import React, { useState } from 'react';

interface ServiceRequestModalProps {
  initialDept: string;
  initialItem: string;
  deptMap: Record<string, string[]>;
  onClose: () => void;
  onSubmit: (dept: string, desc: string, priority: string) => void;
}

export const ServiceRequestModal: React.FC<ServiceRequestModalProps> = ({
  initialDept,
  initialItem,
  deptMap,
  onClose,
  onSubmit
}) => {
  const [dept, setDept] = useState(initialDept || Object.keys(deptMap)[0]);
  const [desc, setDesc] = useState(initialItem ? `${initialItem}: ` : '');
  const [priority, setPriority] = useState('NORMAL');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (desc.trim().length < 3) return;
    onSubmit(dept, desc.trim(), priority);
  };

  return (
    <div
      className="ov"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="md" role="dialog" aria-modal="true">
        <h3>Service request</h3>
        <form onSubmit={handleSubmit}>
          <label htmlFor="sd">Department</label>
          <select
            id="sd"
            value={dept}
            onChange={(e) => setDept(e.target.value)}
          >
            {Object.keys(deptMap).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <label htmlFor="ds">Request description</label>
          <textarea
            id="ds"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            required
            autoFocus
          />

          <label htmlFor="pr">Priority</label>
          <select
            id="pr"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="NORMAL">NORMAL</option>
            <option value="HIGH">HIGH</option>
          </select>

          <div className="row" style={{ marginTop: '16px' }}>
            <button
              type="button"
              className="btn ghost"
              style={{ color: 'var(--ink)' }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="btn">
              Send request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
