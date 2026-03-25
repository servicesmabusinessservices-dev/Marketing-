import React from 'react';

let _selectId = 0;

const Select = React.forwardRef(
  ({ label, error, options = [], placeholder, id, className = '', children, ...rest }, ref) => {
    const resolvedId = id || `fs-${++_selectId}`;
    const errorId = error ? `${resolvedId}-err` : undefined;

    return (
      <div className={`form-field ${error ? 'form-field--error' : ''} ${className}`}>
        {label && (
          <label htmlFor={resolvedId} className="form-label">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={resolvedId}
          className={`form-input ${error ? 'form-input--error' : ''}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId || undefined}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children ||
            options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
        </select>
        {error && (
          <span id={errorId} className="form-error-msg" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
export default Select;
