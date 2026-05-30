'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';

export default function StoreInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return <>{children}</>;
}
