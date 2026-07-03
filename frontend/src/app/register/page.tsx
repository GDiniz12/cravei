'use client';

import { useEffect, useState } from 'react';
import BackButton from '../components/BackButton';
import { API_BASE_URL } from '../../lib/api';

export default function Register() {
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [redirect, setRedirect] = useState<string | null>(null);

  useEffect(() => {
    setRedirect(new URLSearchParams(window.location.search).get('redirect'));
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao registrar');
      }

      // Account created but not logged in yet — send them to log in, then back to where they came from
      window.location.href = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login';
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loginHref = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login';

  return (
    <div className="pitch-section floodlight">
      <div className="container page" style={{ position: 'relative' }}>
        <BackButton />
        <div className="swiss-grid">
          <div className="col-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h1 className="text-huge">
              ENTRE<br />
              <span className="accent-text">NA ARENA.</span>
            </h1>
            <p className="text-large" style={{ marginTop: '2rem', maxWidth: '80%' }}>
              CRIE UMA CONTA PARA COMPETIR CONTRA AMIGOS E DAR PALPITES NOS CAMPEONATOS.
            </p>
          </div>

          <div className="col-6" style={{ display: 'flex', alignItems: 'center' }}>
            <form onSubmit={handleRegister} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {error && <div className="form-error">{error.toUpperCase()}</div>}

              <div className="field">
                <label htmlFor="nickname">Apelido</label>
                <input
                  id="nickname"
                  type="text"
                  className="input"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="password">Senha</label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="confirmPassword">Confirmar Senha</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn" style={{ fontSize: '1.3rem', marginTop: '1rem' }}>
                REGISTRAR
              </button>

              <p className="muted" style={{ fontWeight: 600, fontSize: '1rem', marginTop: '1rem', textTransform: 'uppercase' }}>
                JÁ TEM UMA CONTA? <a href={loginHref} className="accent-text" style={{ textDecoration: 'underline' }}>ENTRE AQUI.</a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
