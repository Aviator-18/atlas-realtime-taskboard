import React from 'react';
import { getInitials } from '../utils/initials';

export interface AvatarProps {
  name: string;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, className = '' }) => {
  const initials = getInitials(name);

  return (
    <span
      title={name}
      aria-label={name}
      className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-surface-lane text-[11px] font-semibold text-ink select-none flex-shrink-0 ${className}`}
    >
      {initials}
    </span>
  );
};
