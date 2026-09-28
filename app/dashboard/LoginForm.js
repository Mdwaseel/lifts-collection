'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) router.refresh();
    else setError(res ? 'Wrong password.' : 'No connection. Try again.');
  }

  return (
    <main className="page">
      <form className="card login" onSubmit={submit}>
        <h1 style={{ fontSize: '1.25rem' }}>Dashboard</h1>
        <p className="lead" style={{ marginBottom: 16 }}>Enter the dashboard password.</p>
        <label htmlFor="password">Password</label>
        <input id="password" type="password" autoFocus autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="field-error" role="alert">{error}</div>}
        <button className="btn" style={{ marginTop: 16, width: '100%' }} disabled={busy || !password}>
          {busy ? 'Checking…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
