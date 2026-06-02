'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import {
  Shield,
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  MailCheck,
} from 'lucide-react';

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});
type ForgotValues = z.infer<typeof forgotSchema>;

export default function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }: ForgotValues) => {
    try {
      await api.post('/auth/request-password-reset', { email });
      // The API responds identically whether or not the email exists, so we
      // show a neutral confirmation rather than revealing account existence.
      setSubmitted(true);
      toast.success('Check your inbox for the reset link.');
    } catch (err) {
      const message =
        (axios.isAxiosError(err) && err.response?.data?.message) ||
        'Could not process the request. Please try again.';
      toast.error(message);
    }
  };

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
          <h2 className="text-xl text-slate-400">Reset your password</h2>
        </div>

        {/* Card */}
        <div className="glass-panel p-8 rounded-2xl">
          {submitted ? (
            <div className="text-center">
              <div className="mx-auto mb-6 w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <MailCheck className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-sm text-slate-300 mb-2">
                If an account exists for that email, we&apos;ve sent a link to
                reset your password.
              </p>
              <p className="text-xs text-slate-500 mb-6">
                The link is valid for one hour.
              </p>
              <Link
                href="/login"
                className="text-indigo-400 hover:text-indigo-300 font-semibold text-sm inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-6"
              noValidate
            >
              <p className="text-sm text-slate-400">
                Enter the email associated with your account and we&apos;ll send
                you a link to reset your password.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="flex items-center rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all-300">
                  <Mail className="w-5 h-5 text-slate-500 mr-3" />
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="name@company.com"
                    className="bg-transparent border-none text-white focus:outline-none w-full text-sm placeholder:text-slate-600"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <span>Send reset link</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-8 text-center text-sm text-slate-500">
            Remembered your password?{' '}
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
