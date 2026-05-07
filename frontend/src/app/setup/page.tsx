'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api, storeTokens } from '@/lib/api';
import { ErrorState, LoadingSkeleton } from '@/components/ui';
import { useAuth } from '@/components/AuthShell';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 12px',
  backgroundColor: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 6,
  color: 'var(--text-primary)',
};

export default function SetupPage() {
  const [checking, setChecking] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ organization_name: '', admin_email: '', admin_full_name: '', admin_password: '' });
  const { reloadUser } = useAuth();

  useEffect(() => {
    api.setup.status()
      .then(status => {
        setInitialized(status.initialized);
        if (status.initialized) window.location.href = '/login';
      })
      .catch(err => setError(err.message || 'Unable to check setup status'))
      .finally(() => setChecking(false));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const tokens = await api.setup.firstRun(form);
      storeTokens(tokens.access_token, tokens.refresh_token);
      await reloadUser();
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Setup failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><LoadingSkeleton label="Checking appliance setup..." /></div>;
  if (initialized) return null;

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 32, background: 'var(--bg-app)' }}>
      <section className="card" style={{ width: '100%', maxWidth: 560, padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 8, background: 'rgba(59,130,246,0.14)', border: '1px solid rgba(59,130,246,0.4)' }}>
            <ShieldCheck color="var(--brand-primary)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.45rem' }}>First-run setup</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>Create the first organization and appliance administrator.</p>
          </div>
        </div>

        {error && <div style={{ marginBottom: 14 }}><ErrorState message={error} /></div>}

        <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
          <label>Organization name<input required style={inputStyle} value={form.organization_name} onChange={e => setForm(p => ({ ...p, organization_name: e.target.value }))} /></label>
          <label>Admin email<input required type="email" style={inputStyle} value={form.admin_email} onChange={e => setForm(p => ({ ...p, admin_email: e.target.value }))} /></label>
          <label>Admin full name<input required style={inputStyle} value={form.admin_full_name} onChange={e => setForm(p => ({ ...p, admin_full_name: e.target.value }))} /></label>
          <label>Password<input required minLength={12} type="password" style={inputStyle} value={form.admin_password} onChange={e => setForm(p => ({ ...p, admin_password: e.target.value }))} /></label>
          <button disabled={submitting} style={{ padding: 12, border: 'none', borderRadius: 6, background: 'var(--brand-primary)', color: '#fff', fontWeight: 900, cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? 'Initializing...' : 'Initialize Appliance'}
          </button>
        </form>
      </section>
    </main>
  );
}
