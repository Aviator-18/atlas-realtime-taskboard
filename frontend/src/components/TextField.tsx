import React, { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, id, className = '', type, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordField = type === 'password';
    const computedType = isPasswordField ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={inputId} className="text-[12.5px] leading-[18px] font-medium text-ink">
            {label}
          </label>
        )}
        <div className="relative w-full flex items-center">
          <input
            ref={ref}
            id={inputId}
            type={computedType}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={errorId}
            className={`h-8 px-2.5 ${isPasswordField ? 'pr-8' : ''} w-full text-[14px] leading-5 text-ink bg-surface-raised border rounded-sm transition-all duration-fast ease-out outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:bg-surface-canvas disabled:text-ink-muted ${
              error ? 'border-danger' : 'border-rule-strong hover:border-ink-muted'
            } ${className}`}
            {...props}
          />
          {isPasswordField && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 text-ink-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-accent rounded-sm outline-none transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
              )}
            </button>
          )}
        </div>
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
