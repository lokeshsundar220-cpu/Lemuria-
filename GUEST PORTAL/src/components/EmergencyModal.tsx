import React, { useState } from 'react';

interface EmergencyModalProps {
  onClose: () => void;
  onSubmit: (description: string) => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ onClose, onSubmit }) => {
  const [desc, setDesc] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (desc.trim().length < 3) return;
    onSubmit(desc.trim());
  };

  return (
    <div
      className="ov"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="md emgm" role="dialog" aria-modal="true">
        <h3 style={{ color: 'var(--red)' }}>Emergency request</h3>
        <p>Please describe your situation.</p>
        <form onSubmit={handleSubmit}>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="I need medical assistance. I am feeling unwell."
            autoFocus
            required
          />
          <div className="row" style={{ marginTop: '16px' }}>
            <button
              type="button"
              className="btn ghost"
              style={{ color: 'var(--ink)' }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="btn red">
              Send emergency alert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
