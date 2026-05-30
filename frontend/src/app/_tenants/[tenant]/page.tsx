'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TenantIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#060608] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  );
}
