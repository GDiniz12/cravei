'use client';

import Image from 'next/image';
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
          <a href={nickname ? '/competitions' : '/'}>
            <Image
              src="/cravei-logo.png"
              alt="Cravei"
              width={163}
              height={74}
              priority
            />
          </a>
        </div>
        {nickname && <div className="site-user">{nickname.toUpperCase()}</div>}
      </header>
    </nav>
  );
}
