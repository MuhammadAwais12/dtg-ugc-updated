import React from "react";

export const KpiSkeletons: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="bg-[#141416] border border-white/5 rounded-xl p-5 h-32 flex flex-col justify-between animate-pulse"
        >
          <div className="space-y-2">
            <div className="h-3 bg-zinc-800 rounded w-1/2" />
            <div className="h-7 bg-zinc-800 rounded w-3/4" />
          </div>
          <div className="h-2.5 bg-zinc-800 rounded w-1/3" />
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton: React.FC = () => {
  return (
    <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden p-5 animate-pulse space-y-4">
      <div className="h-5 bg-zinc-800 rounded w-1/4" />
      <div className="space-y-3 pt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-zinc-900/80 rounded-xl w-full" />
        ))}
      </div>
    </div>
  );
};
