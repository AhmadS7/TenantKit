'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { 
  Shield, 
  Users, 
  CreditCard, 
  Settings, 
  LogOut, 
  Activity, 
  CheckCircle,
  Database,
  Building
} from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout, isLoading: authLoading } = useAuthStore();

  // Redirect to login if unauthenticated once auth store has loaded
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // React Query to fetch tenant dashboard summary
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const response = await api.get('/dashboard/summary');
      return response.data;
    },
    enabled: isAuthenticated,
  });

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

  if (error) {
    return (
      <div className="min-h-screen bg-[#060608] flex items-center justify-center p-6">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold mb-2">Access Forbidden</h2>
          <p className="text-slate-400 text-sm mb-6">
            You do not have access to this workspace, or the session has expired.
          </p>
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-xl transition-all-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const tenant = data?.tenant;
  const members = data?.members || [];

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
              className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-indigo-400 text-sm font-semibold transition-all-300"
            >
              <Activity className="w-5 h-5" />
              <span>Workspace</span>
            </Link>
            <Link
              href="/billing"
              className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white text-sm font-medium transition-all-300"
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

      {/* Main Dashboard Space */}
      <main className="flex-1 flex flex-col overflow-y-auto p-8 relative">
        <div className="glow-bg top-[-20%] right-[-10%] opacity-30" />

        {/* Dashboard Header */}
        <header className="flex justify-between items-center mb-8 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
              <Building className="w-4 h-4" />
              <span>{tenant?.name} Workspace</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white">Security & Team Directory</h1>
          </div>
          <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-400">
            <CheckCircle className="w-4 h-4 mr-1.5" />
            <span>RLS Active</span>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 z-10">
          <div className="glass-panel p-6 rounded-2xl flex items-center space-x-4">
            <div className="p-4 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Active Members</p>
              <p className="text-2xl font-bold text-white">{data?.memberCount}</p>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex items-center space-x-4">
            <div className="p-4 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Subscription Plan</p>
              <p className="text-2xl font-bold text-white capitalize">
                {tenant?.planTier} Plan
              </p>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex items-center space-x-4">
            <div className="p-4 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Tenant Subdomain</p>
              <p className="text-xl font-bold text-white truncate max-w-[200px]">
                {tenant?.slug}.tenantkit.app
              </p>
            </div>
          </div>
        </section>

        {/* RLS Demo Banner */}
        <section className="glass-panel p-6 rounded-2xl mb-8 border-l-4 border-l-indigo-500 z-10">
          <h3 className="font-bold text-white mb-2 flex items-center">
            <Shield className="w-5 h-5 text-indigo-400 mr-2" />
            PostgreSQL Row-Level Security Isolation Demo
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            The membership list below was retrieved from a simple query: <code className="bg-white/5 px-1.5 py-0.5 rounded text-indigo-300">SELECT * FROM memberships</code>. 
            Because PostgreSQL RLS is active on this session, PostgreSQL automatically isolated the records to <code className="bg-white/5 px-1.5 py-0.5 rounded text-indigo-300">tenant_id = '{tenant?.id}'</code>. 
            Attempts by other tenant sessions to inspect this workspace will result in zero rows returned.
          </p>
        </section>

        {/* Team List Table */}
        <section className="glass-panel rounded-2xl overflow-hidden z-10 flex-1">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
            <h3 className="font-bold text-lg text-white">Team Members</h3>
            <span className="text-xs font-semibold text-slate-400">{members.length} members found</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/5 text-slate-500 text-xs font-bold uppercase bg-white/[0.005]">
                  <th className="p-4 pl-6">Email Address</th>
                  <th className="p-4">Workspace Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {members.map((m: any) => (
                  <tr key={m.membershipId} className="hover:bg-white/[0.01] transition-all-300">
                    <td className="p-4 pl-6 font-medium text-white">{m.email}</td>
                    <td className="p-4">
                      <span className="inline-flex px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold capitalize">
                        {m.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center text-xs font-semibold text-emerald-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mr-2" />
                        Active
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-slate-500">{new Date(m.joinedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
