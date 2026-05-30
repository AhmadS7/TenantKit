'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { Shield, Mail, Lock, Server, ArrowRight, AlertCircle, Building } from 'lucide-react';

export default function Register() {
  const router = useRouter();
  const { register, isLoading, error: authError } = useAuthStore();

  // Form states
  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSlugChange = (val: string) => {
    // Only lowercase alphanumeric and hyphens
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setTenantSlug(clean);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tenantName || !tenantSlug || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (tenantSlug.length < 3) {
      setError('Subdomain slug must be at least 3 characters.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      const res = await register(email, password, tenantName, tenantSlug);
      
      // On success, redirect the browser to the new tenant login page
      if (typeof window !== 'undefined') {
        const port = window.location.port ? `:${window.location.port}` : '';
        const domain = window.location.hostname.replace('www.', '').split('.').slice(-2).join('.');
        
        // Redirect to the tenant-specific domain with email prefilled
        window.location.href = `http://${tenantSlug}.${domain}${port}/login?email=${encodeURIComponent(email)}`;
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-[#060608]">
      <div className="glow-bg top-[-10%] left-[-10%]" />
      <div className="glow-bg bottom-[-10%] right-[-10%] opacity-40" />

      <div className="w-full max-w-md z-10 my-8">
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
          <h2 className="text-xl text-slate-400">Create your secure workspace</h2>
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

          <form onSubmit={handleRegisterSubmit} className="space-y-5">
            {/* Step 1: Tenant Details */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Company / Organization Name
              </label>
              <div className="flex items-center rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all-300">
                <Building className="w-5 h-5 text-slate-500 mr-3" />
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="Acme Corporation"
                  className="bg-transparent border-none text-white focus:outline-none w-full text-sm placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Workspace URL (Subdomain)
              </label>
              <div className="flex items-center rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all-300">
                <Server className="w-5 h-5 text-slate-500 mr-3" />
                <input
                  type="text"
                  value={tenantSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="acme"
                  className="bg-transparent border-none text-white focus:outline-none w-full text-sm placeholder:text-slate-600"
                  required
                />
                <span className="text-sm font-semibold text-slate-500">.cortex.app</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Subdomain must be lowercase, alphanumeric, and hyphens.
              </p>
            </div>

            {/* Step 2: User Account */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Administrator Email
              </label>
              <div className="flex items-center rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all-300">
                <Mail className="w-5 h-5 text-slate-500 mr-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@acme.com"
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
                  placeholder="Min. 6 characters"
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
                <span>Provisioning Workspace...</span>
              ) : (
                <>
                  <span>Create Workspace</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-8 text-center text-sm text-slate-500">
            Already have a workspace?{' '}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
