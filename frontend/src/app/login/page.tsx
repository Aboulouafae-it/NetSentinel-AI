export default function LoginPage() {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      backgroundColor: 'var(--bg-app)',
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 50
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '48px', height: '48px', 
            background: 'linear-gradient(135deg, var(--brand-primary), #60a5fa)',
            borderRadius: '8px',
            margin: '0 auto 16px',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute', top: 4, left: 4, right: 4, bottom: 4,
              backgroundColor: 'var(--bg-surface)', borderRadius: '4px'
            }} />
          </div>
          <h1 style={{ fontSize: '1.5rem' }}>NetSentinel AI</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '8px' }}>
            Sign in to your organization workspace
          </p>
        </div>

        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onSubmit={(e) => e.preventDefault()}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Email
            </label>
            <input 
              type="email" 
              defaultValue="admin@netsentinel.ai"
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
              defaultValue="********"
              style={{
                width: '100%', padding: '10px 12px',
                backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)'
              }}
            />
          </div>
          <button style={{
            marginTop: '8px',
            padding: '12px',
            backgroundColor: 'var(--brand-primary)',
            color: 'white',
            fontWeight: 600,
            borderRadius: 'var(--radius-md)',
            transition: 'background-color var(--transition-fast)'
          }}>
            Sign In
          </button>
        </form>
        
        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <p>For MVP demo, authentication is currently stubbed on the frontend.</p>
          <a href="/" style={{ color: 'var(--brand-primary)', display: 'inline-block', marginTop: '8px' }}>
            Go to Dashboard →
          </a>
        </div>
      </div>
    </div>
  );
}
