import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { strings } from '../strings';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    const handleClick = (e: MouseEvent) => {
      // Light dismiss when clicking outside dialog contents (on backdrop)
      if (e.target === dialog) {
        onClose();
      }
    };

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('click', handleClick);

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('click', handleClick);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={`fixed inset-0 m-auto p-5 bg-surface-raised border border-rule rounded-lg shadow-floating backdrop:bg-ink/30 z-50 w-full max-w-md focus-visible:outline-none ${className}`}
    >
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-rule">
        <h2 id={titleId} className="text-[18px] leading-[26px] font-semibold text-ink">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={strings.errors.close}
          className="p-1 rounded-sm text-ink-muted hover:text-ink hover:bg-surface-lane transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>
      <div>{children}</div>
    </dialog>
  );
};
