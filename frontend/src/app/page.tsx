'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { Shield, CreditCard, Activity, Database, ArrowRight, Server } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-between p-6 md:p-24 overflow-hidden">
      {/* Background Glows */}
      <div className="glow-bg top-[-10%] left-[-10%]" />
      <div className="glow-bg bottom-[-10%] right-[-10%] opacity-50" />

      {/* Top Navbar */}
      <header className="w-full max-w-6xl flex justify-between items-center z-10 py-4 border-b border-white/5">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            CORTEX
          </span>
        </div>
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-400 hidden sm:inline">{user?.email}</span>
              <Link
                href="/dashboard"
                className="glass-panel px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5 transition-all-300 flex items-center space-x-2"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg shadow-indigo-600/20 transition-all-300 flex items-center space-x-1"
              >
                <span>Get Started</span>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center text-center z-10 my-16">
        <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full text-xs font-semibold text-indigo-400 mb-8 animate-float">
          <span>Enterprise Multi-Tenant Boilerplate</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
          Production-Ready
          <span className="block bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent mt-2">
            SaaS Architecture
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
          Scale confidently with PostgreSQL Row-Level Security (RLS), JWT rotation, Stripe billing synchronization, and standard AWS cloud configurations.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 z-10">
          <Link
            href="/register"
            className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-8 py-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all-300 flex items-center justify-center space-x-2"
          >
            <span>Deploy Your Tenant</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto glass-panel px-8 py-4 rounded-xl font-semibold hover:bg-white/5 transition-all-300 flex items-center justify-center space-x-2 text-slate-300 hover:text-white"
          >
            <span>Star on GitHub</span>
          </a>
        </div>
      </main>

      {/* Features Grid */}
      <section className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6 z-10 mb-16">
        <div className="glass-panel p-8 rounded-2xl flex flex-col items-start text-left transition-all-300 hover:-translate-y-1">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 mb-6 border border-violet-500/20">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold mb-3 text-slate-200">PostgreSQL RLS Isolation</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Strict row-level policies isolate tenant queries at the database engine level. Zero risk of cross-tenant data leakage.
          </p>
        </div>

        <div className="glass-panel p-8 rounded-2xl flex flex-col items-start text-left transition-all-300 hover:-translate-y-1">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 border border-indigo-500/20">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold mb-3 text-slate-200">Stripe Billing Sync</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Webhooks automatically update subscription tiers in real-time. Native support for Free, Pro, and Enterprise tiers.
          </p>
        </div>

        <div className="glass-panel p-8 rounded-2xl flex flex-col items-start text-left transition-all-300 hover:-translate-y-1">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-6 border border-cyan-500/20">
            <Server className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold mb-3 text-slate-200">IaC Cloud-Native AWS</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Terraform deployment definitions for ECS Fargate, RDS PostgreSQL Multi-AZ clusters, VPC routing, and ElastiCache.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-6xl text-center text-slate-500 text-xs py-8 border-t border-white/5 z-10">
        <p>&copy; {new Date().getFullYear()} Cortex App. Built with Google DeepMind Antigravity.</p>
      </footer>
    </div>
  );
}
