'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import axios from 'axios';
import { api } from '@/lib/api';
import { 
  Shield, 
  CreditCard, 
  LogOut, 
  Activity, 
  Check,
  Building,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

export default function Billing() {
  const router = useRouter();
  const { user, isAuthenticated, logout, isLoading: authLoading } = useAuthStore();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Redirect to login if unauthenticated once auth store has loaded
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // React Query to fetch tenant dashboard summary
  const { data, isLoading } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const response = await api.get('/dashboard/summary');
      return response.data;
    },
    enabled: isAuthenticated,
  });

  const handleCheckout = async (plan: string) => {
    setCheckoutLoading(plan);
    setErrorMsg(null);
    try {
      const response = await api.post('/billing/checkout', { plan });
      const { url } = response.data;
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      const message =
        (axios.isAxiosError(err) && err.response?.data?.message) || `Checkout failed for ${plan} plan.`;
      setErrorMsg(message);
      setCheckoutLoading(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (authLoading || (isAuthenticated && isLoading)) {
    return (
      <div className="min-h-screen bg-[#060608] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-slate-400 text-sm font-medium">Resolving tenant space...</span>
        </div>
      </div>
    );
  }

  const tenant = data?.tenant;

  return (
    <div className="min-h-screen flex bg-[#060608] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-black/25 flex flex-col justify-between p-6">
        <div>
          {/* Logo */}
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              TENANTKIT
            </span>
          </div>

          {/* Nav items */}
          <nav className="space-y-1.5">
            <Link
              href="/dashboard"
              className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white text-sm font-medium transition-all-300"
            >
              <Activity className="w-5 h-5" />
              <span>Workspace</span>
            </Link>
            <Link
              href="/billing"
              className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-indigo-400 text-sm font-semibold transition-all-300"
            >
              <CreditCard className="w-5 h-5" />
              <span>Billing & Plans</span>
            </Link>
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="border-t border-white/5 pt-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400">
              {user?.email?.substring(0, 2).toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-sm font-semibold text-slate-300 truncate">{user?.email}</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 text-sm font-medium transition-all-300"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Space */}
      <main className="flex-1 flex flex-col overflow-y-auto p-8 relative">
        <div className="glow-bg top-[-20%] right-[-10%] opacity-35" />

        {/* Header */}
        <header className="flex justify-between items-center mb-8 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
              <Building className="w-4 h-4" />
              <span>{tenant?.name} Workspace</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white">Billing Settings & Pricing</h1>
          </div>
          <div className="flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full text-xs font-bold text-indigo-400">
            <Sparkles className="w-4 h-4 mr-1.5" />
            <span>Active Plan: {tenant?.planTier?.toUpperCase()}</span>
          </div>
        </header>

        {errorMsg && (
          <div className="glass-panel p-4 rounded-xl text-red-400 border-l-4 border-l-red-500 text-sm mb-6 z-10">
            {errorMsg}
          </div>
        )}

        {/* Pricing Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 z-10">
          {/* Free Tier */}
          <div className="glass-panel p-8 rounded-2xl flex flex-col justify-between border border-white/5 relative">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Startup</span>
              <h3 className="text-2xl font-bold text-white mt-1 mb-2">Free Sandbox</h3>
              <p className="text-slate-400 text-sm mb-6">Explore the multi-tenancy architecture features.</p>
              <div className="text-4xl font-extrabold text-white mb-6">$0<span className="text-sm font-normal text-slate-500">/mo</span></div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-sm text-slate-300">
                  <Check className="w-4 h-4 text-indigo-400 mr-2 shrink-0" />
                  <span>Up to 5 Workspace Members</span>
                </li>
                <li className="flex items-center text-sm text-slate-300">
                  <Check className="w-4 h-4 text-indigo-400 mr-2 shrink-0" />
                  <span>Shared Subdomain Deployment</span>
                </li>
                <li className="flex items-center text-sm text-slate-300">
                  <Check className="w-4 h-4 text-indigo-400 mr-2 shrink-0" />
                  <span>Standard SQLite/Postgres RLS</span>
                </li>
              </ul>
            </div>
            <button
              disabled={tenant?.planTier === 'free'}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-center border border-white/10 text-slate-400 hover:text-white transition-all-300 disabled:bg-emerald-500/10 disabled:text-emerald-400 disabled:border-emerald-500/20 disabled:cursor-default"
            >
              {tenant?.planTier === 'free' ? 'Active Plan' : 'Downgrade'}
            </button>
          </div>

          {/* Pro Tier */}
          <div className="glass-panel p-8 rounded-2xl flex flex-col justify-between border-2 border-indigo-500 relative">
            <div className="absolute top-4 right-4 bg-indigo-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Popular
            </div>
            <div>
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">SaaS Scale</span>
              <h3 className="text-2xl font-bold text-white mt-1 mb-2">Pro Team</h3>
              <p className="text-slate-400 text-sm mb-6">Complete billing synchronization and API scale.</p>
              <div className="text-4xl font-extrabold text-white mb-6">$29<span className="text-sm font-normal text-slate-500">/mo</span></div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-sm text-slate-300">
                  <Check className="w-4 h-4 text-indigo-400 mr-2 shrink-0" />
                  <span>Unlimited Workspace Members</span>
                </li>
                <li className="flex items-center text-sm text-slate-300">
                  <Check className="w-4 h-4 text-indigo-400 mr-2 shrink-0" />
                  <span>Custom Domains (client.com)</span>
                </li>
                <li className="flex items-center text-sm text-slate-300">
                  <Check className="w-4 h-4 text-indigo-400 mr-2 shrink-0" />
                  <span>Full Stripe Webhook Sync</span>
                </li>
                <li className="flex items-center text-sm text-slate-300">
                  <Check className="w-4 h-4 text-indigo-400 mr-2 shrink-0" />
                  <span>High-Priority Redis Cache</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleCheckout('pro')}
              disabled={tenant?.planTier === 'pro' || checkoutLoading === 'pro'}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {tenant?.planTier === 'pro' ? 'Active Plan' : checkoutLoading === 'pro' ? 'Redirecting...' : 'Upgrade to Pro'}
            </button>
          </div>

          {/* Enterprise Tier */}
          <div className="glass-panel p-8 rounded-2xl flex flex-col justify-between border border-white/5 relative">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enterprise</span>
              <h3 className="text-2xl font-bold text-white mt-1 mb-2">Enterprise Plan</h3>
              <p className="text-slate-400 text-sm mb-6">Isolated dedicated infrastructure configurations.</p>
              <div className="text-4xl font-extrabold text-white mb-6">$199<span className="text-sm font-normal text-slate-500">/mo</span></div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-sm text-slate-300">
                  <Check className="w-4 h-4 text-indigo-400 mr-2 shrink-0" />
                  <span>Dedicated ECS Task Allocations</span>
                </li>
                <li className="flex items-center text-sm text-slate-300">
                  <Check className="w-4 h-4 text-indigo-400 mr-2 shrink-0" />
                  <span>Isolated Postgres RDS Schema</span>
                </li>
                <li className="flex items-center text-sm text-slate-300">
                  <Check className="w-4 h-4 text-indigo-400 mr-2 shrink-0" />
                  <span>SLA Guarantee & 24/7 Support</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleCheckout('enterprise')}
              disabled={tenant?.planTier === 'enterprise' || checkoutLoading === 'enterprise'}
              className="w-full py-3 px-4 rounded-xl border border-white/10 hover:border-white/20 text-slate-300 hover:text-white font-semibold text-sm transition-all-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {tenant?.planTier === 'enterprise' ? 'Active Plan' : checkoutLoading === 'enterprise' ? 'Redirecting...' : 'Contact Sales'}
            </button>
          </div>
        </section>

        {/* Footer info */}
        <footer className="glass-panel p-6 rounded-2xl text-slate-500 text-xs z-10">
          <p className="mb-2">Stripe Subscription Sync Status: <b>{tenant?.subscriptionStatus?.toUpperCase()}</b></p>
          <p>Upon clicking upgrade, a Stripe Checkout portal will be initialized via the NestJS API.</p>
        </footer>
      </main>
    </div>
  );
}
