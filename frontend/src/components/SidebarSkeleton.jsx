import React from "react";

const SidebarSkeleton = () => {
  const placeholders = Array.from({ length: 8 });

  return (
    <div className="flex flex-col gap-1 p-2">
      {placeholders.map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg p-2">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-2.5 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default SidebarSkeleton;
