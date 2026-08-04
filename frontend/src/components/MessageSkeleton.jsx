import React from "react";

const MessageSkeleton = () => {
  const placeholders = Array.from({ length: 6 });

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {placeholders.map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
          <div
            className={`h-9 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800 ${
              i % 3 === 0 ? "w-40" : "w-56"
            }`}
          />
        </div>
      ))}
    </div>
  );
};

export default MessageSkeleton;
