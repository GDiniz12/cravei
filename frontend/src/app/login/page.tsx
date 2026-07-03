'use client';

import { useEffect, useState } from 'react';
import BackButton from '../components/BackButton';
import { API_BASE_URL } from '../../lib/api';

export default function Login() {
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [redirect, setRedirect] = useState<string | null>(null);

  useEffect(() => {
    setRedirect(new URLSearchParams(window.location.search).get('redirect'));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao entrar');
      }

      // Save token
      localStorage.setItem('cravei_token', data.token);
      localStorage.setItem('cravei_user', JSON.stringify(data.user));

      // Redirect back to wherever the user came from (e.g. a shared competition link)
      window.location.href = redirect || '/competitions';
    } catch (err: any) {
      setError(err.message);
    }
  };

  const registerHref = redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : '/register';

  return (
    <div className="pitch-section floodlight">
      <div className="container page" style={{ position: 'relative' }}>
        <BackButton />
        <div className="swiss-grid">
          <div className="col-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h1 className="text-huge">
              BEM-VINDO<br />
              <span className="accent-text">DE VOLTA.</span>
            </h1>
            <p className="text-large" style={{ marginTop: '2rem', maxWidth: '80%' }}>
              INSIRA SUAS CREDENCIAIS PARA VOLTAR A DOMINAR OS RANKINGS.
            </p>
          </div>

          <div className="col-6" style={{ display: 'flex', alignItems: 'center' }}>
            <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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

              <button type="submit" className="btn" style={{ fontSize: '1.3rem', marginTop: '1rem' }}>
                ENTRAR
              </button>

              <p className="muted" style={{ fontWeight: 600, fontSize: '1rem', marginTop: '1rem', textTransform: 'uppercase' }}>
                NÃO TEM UMA CONTA? <a href={registerHref} className="accent-text" style={{ textDecoration: 'underline' }}>REGISTRE-SE AQUI.</a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
