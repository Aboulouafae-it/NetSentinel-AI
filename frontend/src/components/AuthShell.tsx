'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { api, clearTokens, getAccessToken } from '@/lib/api';
import type { User } from '@/lib/types';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  reloadUser: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthShell');
  return value;
}

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLogin = pathname === '/login';
  const isSetup = pathname === '/setup';

  const reloadUser = async () => {
    if (!getAccessToken()) {
      try {
        const setup = await api.setup.status();
        if (!setup.initialized && !isSetup) {
          router.replace('/setup');
          return;
        }
      } catch {
        // If setup status is unavailable, continue to login so the API error is visible there.
      }
      setUser(null);
      setLoading(false);
      if (!isLogin && !isSetup) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    try {
      const currentUser = await api.auth.me();
      setUser(currentUser);
      if (isLogin) router.replace(searchParams.get('next') || '/');
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadUser();
  }, [pathname]);

  const logout = () => {
    clearTokens();
    setUser(null);
    router.replace('/login');
  };

  const value = useMemo(() => ({ user, loading, reloadUser, logout }), [user, loading]);

  if (isLogin || isSetup) {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-secondary)' }}>
        Loading workspace...
      </div>
    );
  }

  if (!user) return null;

  return (
    <AuthContext.Provider value={value}>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <TopBar />
          <main style={{ flex: 1, padding: 'var(--spacing-xl)', overflowY: 'auto' }}>
            {children}
          </main>
        </div>
      </div>
    </AuthContext.Provider>
  );
}
