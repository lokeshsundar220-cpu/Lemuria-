import React, { useState } from 'react';

interface TaskCompleteModalProps {
  task: {
    id: string;
    roomId?: string | null;
    type: string;
    department: string;
  };
  deptName: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (data: { before: string | null; after: string | null; feedback: string }) => void;
}

export const TaskCompleteModal: React.FC<TaskCompleteModalProps> = ({
  task,
  deptName,
  busy,
  onClose,
  onSubmit
}) => {
  const [beforeImg, setBeforeImg] = useState<string | null>(null);
  const [afterImg, setAfterImg] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  const handleFile = (key: 'before' | 'after', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (key === 'before') setBeforeImg(reader.result as string);
      else setAfterImg(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      before: beforeImg,
      after: afterImg,
      feedback
    });
  };

  return (
    <div className="ov">
      <div className="mod">
        <h2 className="serif">Complete {deptName} Task</h2>
        <div className="mu" style={{ marginBottom: '12px' }}>
          {task.roomId ? `Room ${task.roomId} · ` : ''}
          {task.type}
        </div>
        <form onSubmit={handleSubmit}>
          {task.department !== 'fnb' ? (
            <div className="grid g2" style={{ marginBottom: '12px' }}>
              <div>
                <label className="l">Before Image</label>
                <label className="img">
                  {beforeImg ? (
                    <img src={beforeImg} alt="Before" />
                  ) : (
                    'Tap / click to attach proof image'
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => handleFile('before', e)}
                  />
                </label>
              </div>
              <div>
                <label className="l">After Image</label>
                <label className="img">
                  {afterImg ? (
                    <img src={afterImg} alt="After" />
                  ) : (
                    'Tap / click to attach proof image'
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => handleFile('after', e)}
                  />
                </label>
              </div>
            </div>
          ) : null}

          <label className="l">Completion & Quality Notes</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Notes on condition, amenities refilled, repairs performed…"
          />

          <div className="row" style={{ marginTop: '18px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn gh" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn gd" disabled={busy}>
              {busy ? <span className="spinner"></span> : null}
              {busy ? ' Saving…' : 'SUBMIT COMPLETION'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
