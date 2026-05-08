'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, storeTokens } from '@/lib/api';
import { useAuth } from '@/components/AuthShell';
import { LockKeyhole, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const { reloadUser } = useAuth();
  const [version, setVersion] = useState<string>('v1.0');

  useEffect(() => {
    api.system.version()
      .then(info => setVersion(`v${info.app_version} · ${info.edition}${info.build_date ? ` · ${info.build_date}` : ''}`))
      .catch(() => setVersion('v1.0 · appliance'));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const tokens = await api.auth.login(email, password);
      storeTokens(tokens.access_token, tokens.refresh_token);
      await reloadUser();
      const next = searchParams.get('next');
      if (next) window.location.href = next;
    } catch (err: any) {
      setError(err.message || 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-app)',
      position: 'absolute',
      inset: 0,
      zIndex: 50,
      display: 'grid',
      gridTemplateColumns: 'minmax(320px, 0.9fr) minmax(360px, 1fr)',
    }}>
      <section style={{ padding: '56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid var(--border-subtle)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px' }}>
            <div style={{ width: 42, height: 42, borderRadius: 8, border: '1px solid rgba(59,130,246,0.45)', display: 'grid', placeItems: 'center', background: 'rgba(59,130,246,0.12)' }}>
              <ShieldCheck size={24} color="var(--brand-primary)" />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900 }}>NetSentinel AI</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Operations appliance console</div>
            </div>
          </div>
          <h1 style={{ fontSize: '2.2rem', margin: '0 0 14px', letterSpacing: 0 }}>Secure access for live network operations</h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 520 }}>
            Sign in to monitor alerts, incidents, edge agents, syslog ingestion, wireless health, and polling freshness for your organization.
          </p>
          <div style={{ marginTop: 28, display: 'grid', gap: 10, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <div><strong style={{ color: 'var(--text-primary)' }}>Local-first MVP:</strong> designed for appliance deployments and private networks.</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Workspace:</strong> resolved from your authenticated backend user.</div>
          </div>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>NetSentinel AI {version} · JWT login · SSO planned</div>
      </section>

      <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div className="card" style={{ width: '100%', maxWidth: '430px', padding: '32px' }}>
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--brand-primary)', fontSize: '0.78rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: 12 }}>
              <LockKeyhole size={15} /> Authenticated console
            </div>
            <h2 style={{ fontSize: '1.45rem', margin: '0 0 8px' }}>Sign in</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Use your NetSentinel organization account.</p>
          </div>

          <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onSubmit={handleSubmit}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Email
            </label>
            <input 
              type="email" 
              placeholder="operator@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px',
                backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Password
            </label>
            <input 
              type="password" 
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px',
                backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)'
              }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
            Remember this browser for the MVP session
          </label>
          {error && (
            <div style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: 'var(--radius-md)',
              color: '#ef4444',
              fontSize: '0.875rem',
            }}>{error}</div>
          )}
          <button disabled={submitting || !email || !password} style={{
            marginTop: '8px',
            padding: '12px',
            backgroundColor: 'var(--brand-primary)',
            color: 'white',
            fontWeight: 600,
            borderRadius: 'var(--radius-md)',
            transition: 'background-color var(--transition-fast)',
            opacity: submitting || !email || !password ? 0.7 : 1,
            cursor: submitting || !email || !password ? 'not-allowed' : 'pointer',
          }}>
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
          <button type="button" disabled style={{ padding: 12, backgroundColor: 'transparent', color: 'var(--text-muted)', fontWeight: 700, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', cursor: 'not-allowed' }}>
            SSO coming soon
          </button>
        </form>
        
        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <p>MVP authentication stores JWT tokens in this browser. Use trusted operator workstations only.</p>
        </div>
      </div>
      </section>
    </div>
  );
}
