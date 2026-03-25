import React, { useEffect, useRef } from 'react';
import './ConfirmDialog.css';

const ConfirmDialog = ({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'warning', onConfirm, onCancel }) => {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (open && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className={`confirm-card confirm-card-${tone}`}>
        <h3 id="confirm-title" className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button type="button" className="confirm-btn confirm-btn-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" ref={confirmRef} className={`confirm-btn confirm-btn-${tone}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
