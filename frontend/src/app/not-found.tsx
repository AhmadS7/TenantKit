import Link from 'next/link';
import { Compass, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-[#060608]">
      <div className="glow-bg top-[-10%] left-[-10%]" />
      <div className="glass-panel p-8 rounded-2xl max-w-md w-full z-10 text-center">
        <div className="mx-auto mb-6 w-14 h-14 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Compass className="w-7 h-7 text-indigo-400" />
        </div>
        <h1 className="text-5xl font-bold text-white mb-2">404</h1>
        <h2 className="text-lg font-semibold text-slate-300 mb-2">
          Page not found
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all-300 inline-flex items-center justify-center space-x-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to home</span>
        </Link>
      </div>
    </div>
  );
}
