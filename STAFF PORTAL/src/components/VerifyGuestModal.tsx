import React from 'react';
import { Pill } from './Pill';

interface VerifyGuestModalProps {
  arrival: {
    id: string;
    guest: string;
    room: string;
    rtype: string;
    resId: string;
    party: string;
    nights: number;
    idType: string;
    idNo: string;
    pay: string;
    req: string;
    chk: {
      id: boolean;
      res: boolean;
      pay: boolean;
    };
  };
  busy: boolean;
  onToggleCheck: (key: 'id' | 'res' | 'pay') => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const VerifyGuestModal: React.FC<VerifyGuestModalProps> = ({
  arrival,
  busy,
  onToggleCheck,
  onClose,
  onConfirm
}) => {
  const isOk = arrival.chk.id && arrival.chk.res && arrival.chk.pay;

  return (
    <div className="ov">
      <div className="mod">
        <div className="row bt">
          <h2 className="serif">Front Desk Guest Verification</h2>
          <Pill label={isOk ? 'VERIFIED' : 'AWAITING VERIFICATION'} />
        </div>
        <div className="grid g2" style={{ gap: '10px', margin: '12px 0' }}>
          <div>
            <span className="mu">Guest</span>
            <br />
            <b>{arrival.guest}</b>
          </div>
          <div>
            <span className="mu">Reservation Ref</span>
            <br />
            <b>{arrival.resId}</b>
          </div>
          <div>
            <span className="mu">Room</span>
            <br />
            <b>
              {arrival.room} · {arrival.rtype}
            </b>
          </div>
          <div>
            <span className="mu">Party</span>
            <br />
            <b>
              {arrival.party} · {arrival.nights} nights
            </b>
          </div>
          <div>
            <span className="mu">ID Presented</span>
            <br />
            <b>
              {arrival.idType} {arrival.idNo}
            </b>
          </div>
          <div>
            <span className="mu">Payment Method</span>
            <br />
            <b>{arrival.pay}</b>
          </div>
        </div>
        <div className="mu" style={{ marginBottom: '8px' }}>
          Special Requests: <b style={{ color: 'var(--tx)' }}>{arrival.req}</b>
        </div>

        <label
          className="row"
          style={{
            padding: '10px 12px',
            border: '1px solid var(--ln)',
            borderRadius: '10px',
            marginTop: '8px',
            cursor: 'pointer',
            background: '#081A2D'
          }}
        >
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={arrival.chk.id}
            onChange={() => onToggleCheck('id')}
          />
          <span>Passport / Government ID checked and matches reservation name</span>
        </label>

        <label
          className="row"
          style={{
            padding: '10px 12px',
            border: '1px solid var(--ln)',
            borderRadius: '10px',
            marginTop: '8px',
            cursor: 'pointer',
            background: '#081A2D'
          }}
        >
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={arrival.chk.res}
            onChange={() => onToggleCheck('res')}
          />
          <span>Reservation stay dates & suite tier confirmed with guest</span>
        </label>

        <label
          className="row"
          style={{
            padding: '10px 12px',
            border: '1px solid var(--ln)',
            borderRadius: '10px',
            marginTop: '8px',
            cursor: 'pointer',
            background: '#081A2D'
          }}
        >
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={arrival.chk.pay}
            onChange={() => onToggleCheck('pay')}
          />
          <span>Payment pre-authorization or deposit received</span>
        </label>

        <div className="row" style={{ marginTop: '20px', justifyContent: 'flex-end' }}>
          <button className="btn gh" onClick={onClose} disabled={busy}>
            Close
          </button>
          <button className="btn gd" disabled={!isOk || busy} onClick={onConfirm}>
            {busy ? <span className="spinner"></span> : null}
            {busy ? ' Processing…' : 'COMPLETE CHECK-IN & ISSUE KEY'}
          </button>
        </div>
      </div>
    </div>
  );
};
