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

  // Lock background scrolling and intercept Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    const handlePreventScroll = (e: WheelEvent | TouchEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('wheel', handlePreventScroll, { passive: false });
    window.addEventListener('touchmove', handlePreventScroll, { passive: false });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('wheel', handlePreventScroll);
      window.removeEventListener('touchmove', handlePreventScroll);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    const handleClick = (e: MouseEvent) => {
      if (dialogRef.current) {
        const rect = dialogRef.current.getBoundingClientRect();
        const clickedInside =
          rect.top <= e.clientY &&
          e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX &&
          e.clientX <= rect.left + rect.width;

        if (!clickedInside) {
          onClose();
        }
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
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 transition-opacity duration-fast"
        aria-hidden="true"
        onClick={onClose}
        onWheel={(e) => e.preventDefault()}
        onTouchMove={(e) => e.preventDefault()}
      />
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className={`fixed inset-0 m-auto p-5 bg-surface-raised border border-rule rounded-lg shadow-floating backdrop:bg-black/40 backdrop:backdrop-blur-[2px] z-50 w-full max-w-md focus-visible:outline-none ${className}`}
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
    </>
  );
};
