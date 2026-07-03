'use client';

import { useEffect, useState } from 'react';

export default function Header() {
  const [nickname, setNickname] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('cravei_user');
    if (!stored) return;
    try {
      setNickname(JSON.parse(stored).nickname ?? null);
    } catch {
      setNickname(null);
    }
  }, []);

  return (
    <nav className="container">
      <header className="site-header">
        <div className="site-logo">
          <a href={nickname ? '/competitions' : '/'}>Cravei</a>
        </div>
        {nickname && <div className="site-user">{nickname.toUpperCase()}</div>}
      </header>
    </nav>
  );
}
