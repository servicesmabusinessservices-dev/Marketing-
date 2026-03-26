import React from 'react';
import './Button.css';

const variantClass = {
  primary: 'btn--primary',
  secondary: 'btn--secondary',
  ghost: 'btn--ghost',
  danger: 'btn--danger',
  'danger-fill': 'btn--danger-fill',
  icon: 'btn--icon',
};

const sizeClass = { sm: 'btn--sm', md: '', lg: 'btn--lg' };

const Button = React.forwardRef(
  (
    {
      variant = 'secondary',
      size = 'md',
      block = false,
      loading = false,
      className = '',
      children,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const classes = [
      'btn',
      variantClass[variant] || '',
      sizeClass[size] || '',
      block && 'btn--block',
      loading && 'btn--loading',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
export default Button;
