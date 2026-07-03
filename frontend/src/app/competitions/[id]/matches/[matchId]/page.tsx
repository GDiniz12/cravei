'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import BackButton from '../../../../components/BackButton';

export default function MatchPredictions() {
  const params = useParams();
  const id = params.id as string;
  const matchId = params.matchId as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('cravei_token');
    if (!token) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    fetch(`http://localhost:3001/api/competitions/${id}/matches/${matchId}/predictions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, matchId]);

  if (loading) return <div className="container page display" style={{ fontSize: '2rem' }}>CARREGANDO...</div>;
  if (notFound || !data) return (
    <div className="container page">
      <BackButton />
      <div className="display" style={{ fontSize: '2rem' }}>PARTIDA NÃO ENCONTRADA.</div>
    </div>
  );

  const { match, hasStarted, totalMembers, submittedCount, myPrediction, predictions, stats } = data;
  const isLive = ['FINISHED', 'IN_PLAY', 'PAUSED'].includes(match.status);

  return (
    <div className="container page">
      <BackButton />

      <p className="match-meta">
        {new Date(match.kickoffTime).toLocaleString('pt-BR')} | STATUS: {match.status}
      </p>
      <div className="match-teams" style={{ marginBottom: '3rem' }}>
        <span className="team team-home">
          {match.homeTeamName}
          {match.homeTeamLogo && (
            <Image src={match.homeTeamLogo} alt={match.homeTeamName} width={40} height={40} unoptimized className="team-crest" />
          )}
        </span>
        <span className="match-vs">
          {isLive ? `${match.homeScore ?? 0} x ${match.awayScore ?? 0}` : 'VS'}
        </span>
        <span className="team team-away">
          {match.awayTeamLogo && (
            <Image src={match.awayTeamLogo} alt={match.awayTeamName} width={40} height={40} unoptimized className="team-crest" />
          )}
          {match.awayTeamName}
        </span>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <p className="muted" style={{ textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
          SEU PALPITE
        </p>
        {myPrediction ? (
          <p className="display accent-text" style={{ fontSize: '2rem' }}>
            {myPrediction.predictedHomeScore} x {myPrediction.predictedAwayScore}
          </p>
        ) : (
          <p className="muted">Você ainda não palpitou nessa partida.</p>
        )}
      </div>

      {!hasStarted ? (
        <div className="card">
          <p className="text-large" style={{ marginBottom: '0.5rem' }}>
            {submittedCount} DE {totalMembers} PARTICIPANTE(S) JÁ PALPITARAM
          </p>
          <p className="muted">
            Os palpites de todo mundo (e as estatísticas) serão revelados assim que a partida começar.
          </p>
        </div>
      ) : (
        <>
          {stats && (
            <div className="card" style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>ESTATÍSTICAS DOS PALPITES</h2>

              <div className="stat-bar">
                {stats.homeWinPct > 0 && (
                  <div className="stat-bar-segment" style={{ width: `${stats.homeWinPct}%`, backgroundColor: 'var(--series-home)' }} />
                )}
                {stats.drawPct > 0 && (
                  <div className="stat-bar-segment" style={{ width: `${stats.drawPct}%`, backgroundColor: 'var(--series-draw)' }} />
                )}
                {stats.awayWinPct > 0 && (
                  <div className="stat-bar-segment" style={{ width: `${stats.awayWinPct}%`, backgroundColor: 'var(--series-away)' }} />
                )}
              </div>
              <div className="stat-bar-legend">
                <span><i style={{ backgroundColor: 'var(--series-home)' }} /> CASA {stats.homeWinPct}%</span>
                <span><i style={{ backgroundColor: 'var(--series-draw)' }} /> EMPATE {stats.drawPct}%</span>
                <span><i style={{ backgroundColor: 'var(--series-away)' }} /> FORA {stats.awayWinPct}%</span>
              </div>

              <div className="stat-tiles">
                <div className="stat-tile">
                  <span className="stat-tile-label">MÉDIA DE GOLS PALPITADA</span>
                  <span className="stat-tile-value">{stats.avgHomeGoals} x {stats.avgAwayGoals}</span>
                </div>

                {stats.mostCommonScore && (
                  <div className="stat-tile">
                    <span className="stat-tile-label">PLACAR MAIS PALPITADO</span>
                    <span className="stat-tile-value">
                      {stats.mostCommonScore.home} x {stats.mostCommonScore.away}{' '}
                      <span className="muted" style={{ fontSize: '1rem' }}>({stats.mostCommonScore.pct}%)</span>
                    </span>
                  </div>
                )}

                {stats.accuracy && (
                  <div className="stat-tile">
                    <span className="stat-tile-label">RESULTADO DOS PALPITES</span>
                    <span className="stat-tile-value" style={{ fontSize: '1.1rem' }}>
                      {stats.accuracy.exact} EXATO(S) · {stats.accuracy.winner} ACERTOU O VENCEDOR · {stats.accuracy.wrong} ERROU
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {predictions.map((p: any) => (
              <div key={p.userId} className={`ranking-row${p.isSelf ? ' ranking-row-self' : ''}`}>
                <span className="ranking-nickname">{p.nickname}{p.isSelf ? ' (VOCÊ)' : ''}</span>
                <span className="ranking-points">{p.predictedHomeScore} x {p.predictedAwayScore}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
