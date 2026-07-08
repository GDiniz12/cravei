'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import BackButton from '../../../components/BackButton';
import { API_BASE_URL } from '../../../../lib/api';

interface MemberStats {
  userId: string;
  nickname: string;
  isSelf: boolean;
  totalPoints: number;
  cravadaPct: number | null;
  acertoPct: number | null;
  aproveitamentoPct: number | null;
  currentStreak: number;
  participationPct: number | null;
  bestMatchday: { matchday: number; points: number } | null;
  worstMatchday: { matchday: number; points: number } | null;
  trend: 'up' | 'down' | 'same' | null;
  trendDelta: number | null;
  favoriteScore: { home: number; away: number; count: number } | null;
}

function formatPct(value: number | null): string {
  return value != null ? `${value}%` : '—';
}

function formatMatchday(m: { matchday: number; points: number } | null): string {
  return m ? `RODADA ${m.matchday} · ${m.points} PTS` : '—';
}

function formatTrend(trend: MemberStats['trend'], delta: number | null): string {
  if (trend === 'up') return `↑ ${delta}`;
  if (trend === 'down') return `↓ ${Math.abs(delta ?? 0)}`;
  if (trend === 'same') return '=';
  return '—';
}

function formatFavoriteScore(score: MemberStats['favoriteScore']): string {
  return score ? `${score.home} X ${score.away} (${score.count}X)` : '—';
}

export default function CompetitionRanking() {
  const params = useParams();
  const id = params.id as string;

  const [competitionName, setCompetitionName] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberStats[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cravei_token');
    if (!token) {
      window.location.href = `/register?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    fetch(`${API_BASE_URL}/api/competitions/${id}/ranking`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setCompetitionName(data.competition?.name ?? null);
        setMembers(data.members ?? null);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="container page display" style={{ fontSize: '2rem' }}>CARREGANDO...</div>;
  if (!members) return (
    <div className="container page">
      <BackButton href={`/competitions/${id}`} />
      <div className="display" style={{ fontSize: '2rem' }}>COMPETIÇÃO NÃO ENCONTRADA.</div>
    </div>
  );

  return (
    <div className="container page">
      <BackButton href={`/competitions/${id}`} />
      <h1 className="text-huge" style={{ marginBottom: '1rem' }}>CLASSIFICAÇÃO</h1>
      <p className="text-large accent-text" style={{ marginBottom: '3rem' }}>
        {competitionName?.toUpperCase()}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {members.map((member, index) => (
          <div
            key={member.userId}
            className="card"
            style={member.isSelf ? { borderColor: 'var(--volt)', borderWidth: '2px' } : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <span className="ranking-position">{index + 1}º</span>
              <span className="ranking-nickname">{member.nickname}</span>
              <span className="ranking-points">{member.totalPoints} PTS</span>
            </div>

            <div className="stat-tiles">
              <div className="stat-tile">
                <span className="stat-tile-label">TAXA DE CRAVADA</span>
                <span className="stat-tile-value">{formatPct(member.cravadaPct)}</span>
              </div>
              <div className="stat-tile">
                <span className="stat-tile-label">TAXA DE ACERTO</span>
                <span className="stat-tile-value">{formatPct(member.acertoPct)}</span>
              </div>
              <div className="stat-tile">
                <span className="stat-tile-label">APROVEITAMENTO</span>
                <span className="stat-tile-value">{formatPct(member.aproveitamentoPct)}</span>
              </div>
              <div className="stat-tile">
                <span className="stat-tile-label">SEQUÊNCIA ATUAL</span>
                <span className="stat-tile-value">{member.currentStreak} JOGO(S)</span>
              </div>
              <div className="stat-tile">
                <span className="stat-tile-label">PARTICIPAÇÃO</span>
                <span className="stat-tile-value">{formatPct(member.participationPct)}</span>
              </div>
              <div className="stat-tile">
                <span className="stat-tile-label">MELHOR RODADA</span>
                <span className="stat-tile-value" style={{ fontSize: '1.1rem' }}>{formatMatchday(member.bestMatchday)}</span>
              </div>
              <div className="stat-tile">
                <span className="stat-tile-label">PIOR RODADA</span>
                <span className="stat-tile-value" style={{ fontSize: '1.1rem' }}>{formatMatchday(member.worstMatchday)}</span>
              </div>
              <div className="stat-tile">
                <span className="stat-tile-label">TENDÊNCIA</span>
                <span className="stat-tile-value">{formatTrend(member.trend, member.trendDelta)}</span>
              </div>
              <div className="stat-tile">
                <span className="stat-tile-label">PLACAR FAVORITO</span>
                <span className="stat-tile-value" style={{ fontSize: '1.1rem' }}>{formatFavoriteScore(member.favoriteScore)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
