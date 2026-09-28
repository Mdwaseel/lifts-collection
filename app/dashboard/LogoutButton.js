'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.refresh();
  }
  return <button className="btn secondary" onClick={logout}>Sign out</button>;
}
