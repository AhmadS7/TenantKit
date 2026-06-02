'use client';

import React from 'react';
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
  Server,
  ArrowRight,
  AlertCircle,
  Building,
} from 'lucide-react';

const registerSchema = z.object({
  tenantName: z.string().min(1, 'Company / organization name is required.'),
  tenantSlug: z
    .string()
    .min(3, 'Subdomain must be at least 3 characters.')
    .regex(
      /^[a-z0-9-]+$/,
      'Subdomain must be lowercase letters, numbers, and hyphens.',
    ),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});
type RegisterValues = z.infer<typeof registerSchema>;

export default function Register() {
  const { register: registerUser } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      tenantName: '',
      tenantSlug: '',
      email: '',
      password: '',
    },
  });

  const slugField = register('tenantSlug');

  const onSubmit = async ({
    email,
    password,
    tenantName,
    tenantSlug,
  }: RegisterValues) => {
    try {
      await registerUser(email, password, tenantName, tenantSlug);
      toast.success('Workspace created. Redirecting to sign in...');

      // On success, redirect the browser to the new tenant login page
      if (typeof window !== 'undefined') {
        const port = window.location.port ? `:${window.location.port}` : '';
        const domain = window.location.hostname
          .replace('www.', '')
          .split('.')
          .slice(-2)
          .join('.');

        window.location.assign(
          `http://${tenantSlug}.${domain}${port}/login?email=${encodeURIComponent(
            email,
          )}`,
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Registration failed.';
      toast.error(message);
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
              TENANTKIT
            </span>
          </Link>
          <h2 className="text-xl text-slate-400">
            Create your secure workspace
          </h2>
        </div>

        {/* Card */}
        <div className="glass-panel p-8 rounded-2xl">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
            noValidate
          >
            {/* Step 1: Tenant Details */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Company / Organization Name
              </label>
              <div className="flex items-center rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all-300">
                <Building className="w-5 h-5 text-slate-500 mr-3" />
                <input
                  type="text"
                  {...register('tenantName')}
                  placeholder="Acme Corporation"
                  className="bg-transparent border-none text-white focus:outline-none w-full text-sm placeholder:text-slate-600"
                />
              </div>
              {errors.tenantName && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.tenantName.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Workspace URL (Subdomain)
              </label>
              <div className="flex items-center rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all-300">
                <Server className="w-5 h-5 text-slate-500 mr-3" />
                <input
                  type="text"
                  {...slugField}
                  onChange={(e) => {
                    // Keep the visible value constrained to a valid slug.
                    e.target.value = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, '');
                    void slugField.onChange(e);
                  }}
                  placeholder="acme"
                  className="bg-transparent border-none text-white focus:outline-none w-full text-sm placeholder:text-slate-600"
                />
                <span className="text-sm font-semibold text-slate-500">
                  .tenantkit.app
                </span>
              </div>
              {errors.tenantSlug ? (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.tenantSlug.message}
                </p>
              ) : (
                <p className="text-[10px] text-slate-500 mt-1">
                  Subdomain must be lowercase, alphanumeric, and hyphens.
                </p>
              )}
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
                  {...register('email')}
                  placeholder="admin@acme.com"
                  className="bg-transparent border-none text-white focus:outline-none w-full text-sm placeholder:text-slate-600"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="flex items-center rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all-300">
                <Lock className="w-5 h-5 text-slate-500 mr-3" />
                <input
                  type="password"
                  {...register('password')}
                  placeholder="Min. 8 characters"
                  className="bg-transparent border-none text-white focus:outline-none w-full text-sm placeholder:text-slate-600"
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
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
            <Link
              href="/login"
              className="text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
