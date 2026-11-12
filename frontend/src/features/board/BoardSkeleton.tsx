import React from 'react';

export const BoardSkeleton: React.FC = () => {
  return (
    <div className="flex-1 overflow-x-auto p-4 flex gap-3 select-none">
      {[1, 2, 3].map((idx) => (
        <div
          key={idx}
          className="w-[300px] flex-shrink-0 bg-surface-lane rounded-sm p-3 flex flex-col gap-3 min-h-[360px]"
        >
          <div className="h-5 w-24 bg-surface-canvas rounded-sm" />
          <div className="h-20 bg-surface-raised/60 rounded-md" />
          <div className="h-24 bg-surface-raised/60 rounded-md" />
          <div className="h-16 bg-surface-raised/60 rounded-md" />
        </div>
      ))}
    </div>
  );
};
