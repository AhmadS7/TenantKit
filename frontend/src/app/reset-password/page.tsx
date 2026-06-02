'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Shield, Lock, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';

const resetSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });
type ResetValues = z.infer<typeof resetSchema>;

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async ({ password }: ResetValues) => {
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Password updated. You can now sign in.');
      router.push('/login');
    } catch (err) {
      const message =
        (axios.isAxiosError(err) && err.response?.data?.message) ||
        'This reset link is invalid or has expired.';
      toast.error(message);
    }
  };

  if (!token) {
    return (
      <div className="glass-panel p-8 rounded-2xl text-center">
        <div className="mx-auto mb-6 w-14 h-14 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <p className="text-sm text-slate-300 mb-6">
          This password reset link is missing its token or is malformed. Please
          request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="text-indigo-400 hover:text-indigo-300 font-semibold text-sm inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-panel p-8 rounded-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <p className="text-sm text-slate-400">
          Choose a new password for your account.
        </p>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            New Password
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
            <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Confirm New Password
          </label>
          <div className="flex items-center rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all-300">
            <Lock className="w-5 h-5 text-slate-500 mr-3" />
            <input
              type="password"
              {...register('confirmPassword')}
              placeholder="Re-enter your password"
              className="bg-transparent border-none text-white focus:outline-none w-full text-sm placeholder:text-slate-600"
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span>Updating...</span>
          ) : (
            <>
              <span>Reset password</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-[#060608]">
      <div className="glow-bg top-[-10%] left-[-10%]" />
      <div className="glow-bg bottom-[-10%] right-[-10%] opacity-40" />

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
          <h2 className="text-xl text-slate-400">Set a new password</h2>
        </div>

        <Suspense
          fallback={
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-slate-400 text-sm font-medium">
                Loading...
              </span>
            </div>
          }
        >
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
