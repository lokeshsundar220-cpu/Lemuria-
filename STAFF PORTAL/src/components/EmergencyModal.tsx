import React, { useState } from 'react';

interface EmergencyModalProps {
  rooms: { id: string; type: string }[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (roomId: string, text: string) => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  rooms,
  busy,
  onClose,
  onSubmit
}) => {
  const [roomId, setRoomId] = useState(rooms[0]?.id || '201');
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmit(roomId, text.trim());
  };

  return (
    <div className="ov">
      <div className="mod">
        <h2 style={{ color: 'var(--r)', fontSize: '20px' }}>⚠ Broadcast Emergency Alert</h2>
        <p className="mu" style={{ margin: '6px 0 14px' }}>
          Broadcast an urgent priority incident directly to maintenance and operations.
        </p>
        <form onSubmit={handleSubmit}>
          <label className="l">Affected Room</label>
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                Room {r.id} ({r.type})
              </option>
            ))}
          </select>

          <label className="l">Emergency Description</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            placeholder="e.g. Water burst in master bathroom, electrical fault, immediate dispatch required…"
          />

          <div className="row" style={{ marginTop: '16px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn gh" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn rd" disabled={busy}>
              {busy ? <span className="spinner"></span> : null}
              {busy ? ' Broadcasting…' : 'BROADCAST ALERT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
