'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Surface the error for client-side logging / error reporting.
    console.error(error);
  }, [error]);

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-[#060608]">
      <div className="glow-bg top-[-10%] left-[-10%]" />
      <div className="glass-panel p-8 rounded-2xl max-w-md w-full z-10 text-center">
        <div className="mx-auto mb-6 w-14 h-14 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          An unexpected error occurred. You can try again, and if the problem
          persists please contact support.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-600 mb-6 font-mono">
            Reference: {error.digest}
          </p>
        )}
        <button
          onClick={() => unstable_retry()}
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all-300 flex items-center justify-center space-x-2"
        >
          <RefreshCw className="w-5 h-5" />
          <span>Try again</span>
        </button>
      </div>
    </div>
  );
}
