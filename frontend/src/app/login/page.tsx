'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { Shield, Mail, Lock, ArrowRight, Server, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, error: authError, isLoading } = useAuthStore();

  const [subdomain, setSubdomain] = useState('');
  const [isGlobal, setIsGlobal] = useState(true);

  // Form states
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      
      // If we have a subdomain (not www and host length >= 2)
      if (parts.length >= 2 && parts[0] !== 'www' && (parts[1] === 'localhost' || parts[1] === 'cortex')) {
        setSubdomain(parts[0]);
        setIsGlobal(false);
      } else {
        setIsGlobal(true);
      }
    }
  }, []);

  // Redirect if already authenticated on this tenant
  useEffect(() => {
    if (isAuthenticated && !isGlobal) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isGlobal, router]);

  const handleWorkspaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceSlug.trim()) {
      setError('Please enter a workspace subdomain.');
      return;
    }
    const cleanSlug = workspaceSlug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (typeof window !== 'undefined') {
      const port = window.location.port ? `:${window.location.port}` : '';
      const domain = window.location.hostname.replace('www.', '').split('.').slice(-2).join('.');
      
      // Redirect to the tenant subdomain login page
      window.location.href = `http://${cleanSlug}.${domain}${port}/login`;
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    }
  };

  return (
    <div className="w-full max-w-md z-10">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <Link href="/" className="flex items-center space-x-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            CORTEX
          </span>
        </Link>
        <h2 className="text-xl text-slate-400">
          {isGlobal ? 'Sign in to your workspace' : `Sign in to ${subdomain.toUpperCase()}`}
        </h2>
      </div>

      {/* Card */}
      <div className="glass-panel p-8 rounded-2xl">
        {/* Show Errors */}
        {(error || authError) && (
          <div className="flex items-start space-x-2 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-sm text-red-400 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error || authError}</span>
          </div>
        )}

        {isGlobal ? (
          /* Global Workspace Lookup Form */
          <form onSubmit={handleWorkspaceSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Workspace URL
              </label>
              <div className="flex items-center rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all-300">
                <Server className="w-5 h-5 text-slate-500 mr-3" />
                <input
                  type="text"
                  value={workspaceSlug}
                  onChange={(e) => setWorkspaceSlug(e.target.value)}
                  placeholder="your-workspace"
                  className="bg-transparent border-none text-white focus:outline-none w-full text-sm placeholder:text-slate-600"
                />
                <span className="text-sm font-semibold text-slate-500">.cortex.app</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Enter the subdomain associated with your organization.
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all-300 flex items-center justify-center space-x-2"
            >
              <span>Continue to Workspace</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        ) : (
          /* Scoped Auth Login Form */
          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="flex items-center rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all-300">
                <Mail className="w-5 h-5 text-slate-500 mr-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="bg-transparent border-none text-white focus:outline-none w-full text-sm placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="flex items-center rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all-300">
                <Lock className="w-5 h-5 text-slate-500 mr-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-transparent border-none text-white focus:outline-none w-full text-sm placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Links */}
        <div className="mt-8 text-center text-sm text-slate-500">
          Don't have a workspace?{' '}
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold">
            Create one now
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-[#060608]">
      <div className="glow-bg top-[-10%] left-[-10%]" />
      <div className="glow-bg bottom-[-10%] right-[-10%] opacity-40" />

      <Suspense fallback={
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-slate-400 text-sm font-medium">Loading form context...</span>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
