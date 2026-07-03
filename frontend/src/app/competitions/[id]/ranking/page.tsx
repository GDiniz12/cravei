'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import BackButton from '../../../components/BackButton';

export default function CompetitionRanking() {
  const params = useParams();
  const id = params.id as string;

  const [competition, setCompetition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('cravei_token');
    if (!token) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    const storedUser = localStorage.getItem('cravei_user');
    if (storedUser) {
      try {
        setCurrentUserId(JSON.parse(storedUser).id);
      } catch {
        setCurrentUserId(null);
      }
    }

    fetch(`http://localhost:3001/api/competitions/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setCompetition(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="container page display" style={{ fontSize: '2rem' }}>CARREGANDO...</div>;
  if (!competition) return (
    <div className="container page">
      <BackButton />
      <div className="display" style={{ fontSize: '2rem' }}>COMPETIÇÃO NÃO ENCONTRADA.</div>
    </div>
  );

  const ranked = [...competition.members].sort((a: any, b: any) => b.totalPoints - a.totalPoints);

  return (
    <div className="container page">
      <BackButton />
      <h1 className="text-huge" style={{ marginBottom: '1rem' }}>CLASSIFICAÇÃO</h1>
      <p className="text-large accent-text" style={{ marginBottom: '3rem' }}>
        {competition.name.toUpperCase()}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {ranked.map((member: any, index: number) => (
          <div
            key={member.id}
            className={`ranking-row${member.user.id === currentUserId ? ' ranking-row-self' : ''}`}
          >
            <span className="ranking-position">{index + 1}º</span>
            <span className="ranking-nickname">{member.user.nickname}</span>
            <span className="ranking-points">{member.totalPoints} PTS</span>
          </div>
        ))}
      </div>
    </div>
  );
}
