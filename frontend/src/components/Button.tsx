import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive';
  size?: 'sm' | 'md';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', className = '', children, disabled, type = 'button', ...props }, ref) => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-sm transition-all duration-fast ease-out ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ' +
      'disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const sizeClasses = size === 'sm' ? 'h-7 px-2.5 text-[12.5px]' : 'h-8 px-3 text-[14px] leading-5';

    let variantClasses = '';
    if (variant === 'primary') {
      variantClasses = 'bg-accent text-white hover:opacity-90 active:opacity-95';
    } else if (variant === 'secondary') {
      variantClasses =
        'bg-surface-raised border border-rule-strong text-ink hover:bg-surface-canvas active:bg-surface-lane';
    } else if (variant === 'destructive') {
      variantClasses =
        'bg-surface-raised border border-rule text-danger hover:border-danger hover:bg-priority-high-wash/30 active:bg-priority-high-wash/50';
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
