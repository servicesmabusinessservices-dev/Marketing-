import React from 'react';

let _inputId = 0;

const Input = React.forwardRef(
  ({ label, error, helperText, id, className = '', ...rest }, ref) => {
    const resolvedId = id || `fi-${++_inputId}`;
    const errorId = error ? `${resolvedId}-err` : undefined;
    const helperId = helperText && !error ? `${resolvedId}-help` : undefined;

    return (
      <div className={`form-field ${error ? 'form-field--error' : ''} ${className}`}>
        {label && (
          <label htmlFor={resolvedId} className="form-label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={resolvedId}
          className={`form-input ${error ? 'form-input--error' : ''}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId || helperId || undefined}
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

Input.displayName = 'Input';
export default Input;
