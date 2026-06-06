import React from 'react';

export function SkeletonCard() {
  return (
    <div className="stat-card p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-11 h-11 bg-white/5 rounded-xl"></div>
        <div className="w-8 h-8 rounded-full bg-white/5"></div>
      </div>
      <div className="w-24 h-10 bg-white/10 rounded-md mb-2"></div>
      <div className="w-32 h-4 bg-white/5 rounded-md"></div>
    </div>
  );
}

export function SkeletonKanbanBoard() {
  return (
    <div className="flex gap-6 overflow-hidden h-full">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="min-w-[320px] w-[320px] bg-white/[0.02] border border-white/[0.05] rounded-3xl p-4 flex flex-col h-full animate-pulse">
          <div className="flex justify-between items-center mb-6">
            <div className="w-24 h-6 bg-white/10 rounded-md"></div>
            <div className="w-8 h-6 bg-white/5 rounded-md"></div>
          </div>
          <div className="space-y-4">
            <div className="w-full h-32 bg-white/5 rounded-2xl"></div>
            <div className="w-full h-24 bg-white/5 rounded-2xl"></div>
            <div className="w-full h-28 bg-white/5 rounded-2xl"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
