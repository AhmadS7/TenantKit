'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';
import {
  Shield,
  Mail,
  Lock,
  ArrowRight,
  Server,
  AlertCircle,
} from 'lucide-react';

const workspaceSchema = z.object({
  slug: z.string().min(1, 'Please enter a workspace subdomain.'),
});
type WorkspaceValues = z.infer<typeof workspaceSchema>;

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});
type LoginValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();

  const [subdomain, setSubdomain] = useState('');
  const [isGlobal, setIsGlobal] = useState(true);

  const workspaceForm = useForm<WorkspaceValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { slug: '' },
  });

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: searchParams.get('email') || '', password: '' },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');

      // Detect tenant subdomain on the client after mount. Reading window during
      // render would diverge from the server-rendered HTML and break hydration,
      // so the state sync must live in an effect.
      const onSubdomain =
        parts.length >= 2 &&
        parts[0] !== 'www' &&
        (parts[1] === 'localhost' || parts[1] === 'tenantkit');
      /* eslint-disable react-hooks/set-state-in-effect */
      if (onSubdomain) {
        setSubdomain(parts[0]);
        setIsGlobal(false);
      } else {
        setIsGlobal(true);
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, []);

  const onWorkspaceSubmit = ({ slug }: WorkspaceValues) => {
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!cleanSlug) {
      workspaceForm.setError('slug', {
        message: 'Please enter a valid workspace subdomain.',
      });
      return;
    }
    if (typeof window !== 'undefined') {
      const port = window.location.port ? `:${window.location.port}` : '';
      const domain = window.location.hostname
        .replace('www.', '')
        .split('.')
        .slice(-2)
        .join('.');

      // Redirect to the tenant subdomain login page
      window.location.assign(`http://${cleanSlug}.${domain}${port}/login`);
    }
  };

  const onLoginSubmit = async ({ email, password }: LoginValues) => {
    try {
      await login(email, password);
      toast.success('Signed in successfully.');
      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed.';
      toast.error(message);
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
            TENANTKIT
          </span>
        </Link>
        <h2 className="text-xl text-slate-400">
          {isGlobal
            ? 'Sign in to your workspace'
            : `Sign in to ${subdomain.toUpperCase()}`}
        </h2>
      </div>

      {/* Card */}
      <div className="glass-panel p-8 rounded-2xl">
        {isGlobal ? (
          /* Global Workspace Lookup Form */
          <form
            onSubmit={workspaceForm.handleSubmit(onWorkspaceSubmit)}
            className="space-y-6"
            noValidate
          >
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Workspace URL
              </label>
              <div className="flex items-center rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all-300">
                <Server className="w-5 h-5 text-slate-500 mr-3" />
                <input
                  type="text"
                  {...workspaceForm.register('slug')}
                  placeholder="your-workspace"
                  className="bg-transparent border-none text-white focus:outline-none w-full text-sm placeholder:text-slate-600"
                />
                <span className="text-sm font-semibold text-slate-500">
                  .tenantkit.app
                </span>
              </div>
              {workspaceForm.formState.errors.slug ? (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {workspaceForm.formState.errors.slug.message}
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-2">
                  Enter the subdomain associated with your organization.
                </p>
              )}
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
          <form
            onSubmit={loginForm.handleSubmit(onLoginSubmit)}
            className="space-y-6"
            noValidate
          >
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="flex items-center rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all-300">
                <Mail className="w-5 h-5 text-slate-500 mr-3" />
                <input
                  type="email"
                  {...loginForm.register('email')}
                  placeholder="name@company.com"
                  className="bg-transparent border-none text-white focus:outline-none w-full text-sm placeholder:text-slate-600"
                />
              </div>
              {loginForm.formState.errors.email && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {loginForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Forgot?
                </Link>
              </div>
              <div className="flex items-center rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all-300">
                <Lock className="w-5 h-5 text-slate-500 mr-3" />
                <input
                  type="password"
                  {...loginForm.register('password')}
                  placeholder="••••••••"
                  className="bg-transparent border-none text-white focus:outline-none w-full text-sm placeholder:text-slate-600"
                />
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginForm.formState.isSubmitting}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loginForm.formState.isSubmitting ? (
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
          Don&apos;t have a workspace?{' '}
          <Link
            href="/register"
            className="text-indigo-400 hover:text-indigo-300 font-semibold"
          >
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

      <Suspense
        fallback={
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-slate-400 text-sm font-medium">
              Loading form context...
            </span>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
