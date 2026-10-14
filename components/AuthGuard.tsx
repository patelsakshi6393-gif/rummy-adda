'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#07070a] flex flex-col items-center justify-center text-amber-400 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <p className="text-sm tracking-wider uppercase text-slate-400 font-medium">
          {loading ? 'Verifying Player Session...' : 'Redirecting to Login...'}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
