import React from 'react'

export default function Loading() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/50 dark:bg-zinc-950/40 p-8">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    )
}
