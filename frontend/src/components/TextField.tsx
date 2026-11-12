import React, { useId } from 'react';

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={inputId} className="text-[12.5px] leading-[18px] font-medium text-ink">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={errorId}
          className={`h-8 px-2.5 text-[14px] leading-5 text-ink bg-surface-raised border rounded-sm transition-all duration-fast ease-out outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:bg-surface-canvas disabled:text-ink-muted ${
            error ? 'border-danger' : 'border-rule-strong hover:border-ink-muted'
          } ${className}`}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-[12.5px] leading-[18px] text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

TextField.displayName = 'TextField';

export interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextAreaField = React.forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, error, id, className = '', rows = 3, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={inputId} className="text-[12.5px] leading-[18px] font-medium text-ink">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={errorId}
          className={`p-2 text-[14px] leading-5 text-ink bg-surface-raised border rounded-sm transition-all duration-fast ease-out outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 resize-y disabled:bg-surface-canvas disabled:text-ink-muted ${
            error ? 'border-danger' : 'border-rule-strong hover:border-ink-muted'
          } ${className}`}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-[12.5px] leading-[18px] text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

TextAreaField.displayName = 'TextAreaField';

export interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: React.ReactNode;
}

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, id, className = '', children, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={inputId} className="text-[12.5px] leading-[18px] font-medium text-ink">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={errorId}
          className={`h-8 px-2 text-[14px] leading-5 text-ink bg-surface-raised border rounded-sm transition-all duration-fast ease-out outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:bg-surface-canvas disabled:text-ink-muted ${
            error ? 'border-danger' : 'border-rule-strong hover:border-ink-muted'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p id={errorId} className="text-[12.5px] leading-[18px] text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

SelectField.displayName = 'SelectField';
