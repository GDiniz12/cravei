'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem('cravei_token'));
  }, []);

  return (
    <div className="pitch-section floodlight">
      <div className="container page" style={{ position: 'relative' }}>
        <div className="swiss-grid">
          {/* Left Column (8 cols) */}
          <div className="col-8" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h1 className="text-hero">
              PALPITE.<br />
              <span className="accent-text">DOMINE.</span><br />
              REPITA.
            </h1>
            <p className="text-large" style={{ maxWidth: '80%' }}>
              CRIE COMPETIÇÕES. DESAFIE SEUS AMIGOS. DÊ SEUS PALPITES NOS PRINCIPAIS CAMPEONATOS DE FUTEBOL.
            </p>
            <div style={{ marginTop: '2rem' }}>
              {loggedIn ? (
                <a href="/competitions">
                  <button className="btn" style={{ fontSize: '1.3rem' }}>Entrar nas Competições</button>
                </a>
              ) : (
                <a href="/register">
                  <button className="btn" style={{ fontSize: '1.3rem' }}>Começar a Palpitar</button>
                </a>
              )}
            </div>
          </div>

          {/* Right Column (4 cols) */}
          <div className="col-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing)' }}>
            <div style={{ borderTop: '3px solid var(--line)', paddingTop: '1rem' }}>
              <h3 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>CAMPEONATOS</h3>
              <ul className="display" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '1.4rem', color: 'var(--chalk-dim)' }}>
                <li>BRASILEIRÃO</li>
                <li>PREMIER LEAGUE</li>
                <li>LA LIGA</li>
                <li>LIGUE 1</li>
                <li>CHAMPIONS LEAGUE</li>
                <li>LIBERTADORES</li>
              </ul>
            </div>

            <div style={{ borderTop: '3px solid var(--volt)', paddingTop: '1rem' }}>
              <h3 style={{ fontSize: '1.75rem', marginBottom: '1rem', color: 'var(--volt)' }}>COMO FUNCIONA</h3>
              <p style={{ fontWeight: 600, fontSize: '1.2rem', color: 'var(--chalk-dim)' }}>
                Placar exato = 3 pontos.<br />
                Acertou o vencedor = 1 ponto.<br />
                Errou = 0 pontos.
              </p>
            </div>
          </div>
        </div>

        {/* Decorative large text */}
        <div style={{ marginTop: 'clamp(3rem, 10vw, 10rem)', opacity: 0.06, overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <h2 style={{ fontSize: 'clamp(3rem, 18vw, 15rem)', margin: 0, lineHeight: 0.8 }}>PALPITES DE FUTEBOL</h2>
        </div>
      </div>
    </div>
  );
}
