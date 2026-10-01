import React from "react";
import { ArrowLeft } from "lucide-react";

export default function ConversationSkeleton({ onBack }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden w-full bg-slate-50/50 dark:bg-zinc-950 animate-fade-in select-none">
      {/* Header Skeleton */}
      <div className="h-[64px] flex items-center px-4 sm:px-8 bg-white/95 dark:bg-zinc-950/95 border-b border-slate-200/50 dark:border-zinc-900/80 backdrop-blur-md z-10 flex-shrink-0 justify-between">
        <div className="flex gap-4 items-center min-w-0">
          <div className="flex gap-2 items-center flex-shrink-0">
            {onBack && (
              <button
                type="button"
                className="p-1 -ml-1 text-slate-600 dark:text-zinc-400 sm:hidden cursor-pointer"
                onClick={onBack}
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800 animate-pulse" />
          </div>
          <div className="space-y-1.5 min-w-0">
            <div className="h-3.5 w-28 sm:w-36 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-2.5 w-16 sm:w-24 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-zinc-800 animate-pulse hidden sm:block" />
          <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-zinc-800 animate-pulse" />
        </div>
      </div>

      {/* Message List Skeleton */}
      <div className="flex-1 overflow-hidden p-4 sm:p-6 space-y-4">
        {/* Date header placeholder */}
        <div className="flex justify-center my-2">
          <div className="h-5 w-20 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />
        </div>

        {/* Message bubbles */}
        <div className="flex justify-start">
          <div className="space-y-1.5 max-w-[65%]">
            <div className="h-10 w-44 sm:w-60 bg-slate-200 dark:bg-zinc-800 rounded-2xl rounded-tl-sm animate-pulse" />
            <div className="h-2 w-10 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>

        <div className="flex justify-end">
          <div className="space-y-1.5 items-end flex flex-col max-w-[65%]">
            <div className="h-12 w-52 sm:w-72 bg-slate-200 dark:bg-zinc-800 rounded-2xl rounded-tr-sm animate-pulse" />
            <div className="h-2 w-10 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>

        <div className="flex justify-start">
          <div className="space-y-1.5 max-w-[65%]">
            <div className="h-32 w-52 sm:w-64 bg-slate-200 dark:bg-zinc-800 rounded-2xl rounded-tl-sm animate-pulse" />
            <div className="h-2 w-10 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>

        <div className="flex justify-end">
          <div className="space-y-1.5 items-end flex flex-col max-w-[65%]">
            <div className="h-9 w-36 sm:w-48 bg-slate-200 dark:bg-zinc-800 rounded-2xl rounded-tr-sm animate-pulse" />
            <div className="h-2 w-10 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>

        <div className="flex justify-start">
          <div className="space-y-1.5 max-w-[65%]">
            <div className="h-10 w-40 sm:w-56 bg-slate-200 dark:bg-zinc-800 rounded-2xl rounded-tl-sm animate-pulse" />
            <div className="h-2 w-10 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Input Skeleton */}
      <div className="bg-white dark:bg-zinc-950 border-t border-slate-200/50 dark:border-zinc-900 p-2 sm:p-2.5 flex-shrink-0">
        <div className="flex items-center gap-2.5 max-w-5xl mx-auto bg-slate-100 dark:bg-zinc-900/60 p-1.5 pl-4 rounded-xl border border-transparent">
          <div className="w-5 h-5 rounded bg-slate-200 dark:bg-zinc-800 animate-pulse mr-2" />
          <div className="h-4 flex-1 bg-slate-200 dark:bg-zinc-800/80 rounded animate-pulse" />
          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}
