import React from 'react';

let _textareaId = 0;

const Textarea = React.forwardRef(
  ({ label, error, helperText, id, className = '', rows = 4, ...rest }, ref) => {
    const resolvedId = id || `ft-${++_textareaId}`;
    const errorId = error ? `${resolvedId}-err` : undefined;
    const helperId = helperText && !error ? `${resolvedId}-help` : undefined;

    return (
      <div className={`form-field ${error ? 'form-field--error' : ''} ${className}`}>
        {label && (
          <label htmlFor={resolvedId} className="form-label">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={resolvedId}
          className={`form-input ${error ? 'form-input--error' : ''}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId || helperId || undefined}
          rows={rows}
          {...rest}
        />
        {error && (
          <span id={errorId} className="form-error-msg" role="alert">
            {error}
          </span>
        )}
        {helperText && !error && (
          <span id={helperId} className="form-helper">
            {helperText}
          </span>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
export default Textarea;
