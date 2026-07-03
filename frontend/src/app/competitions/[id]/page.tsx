'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import BackButton from '../../components/BackButton';
import { API_BASE_URL } from '../../../lib/api';

type SaveStatus = 'saving' | 'saved' | 'error';

// Stages whose "matchday" is a round number shared across the whole competition
// (as opposed to knockout ties, where matchday 1/2 means first leg/second leg).
const NUMBERED_ROUND_STAGES = ['REGULAR_SEASON', 'LEAGUE_STAGE', 'GROUP_STAGE'];

const STAGE_LABELS: Record<string, string> = {
  REGULAR_SEASON: 'RODADA',
  LEAGUE_STAGE: 'FASE DE LIGA - RODADA',
  GROUP_STAGE: 'FASE DE GRUPOS - RODADA',
  PLAYOFFS: 'PLAYOFFS',
  PLAY_OFFS: 'PLAYOFFS',
  ROUND_1: 'PRIMEIRA FASE',
  ROUND_2: 'SEGUNDA FASE',
  ROUND_3: 'TERCEIRA FASE',
  LAST_16: 'OITAVAS DE FINAL',
  QUARTER_FINALS: 'QUARTAS DE FINAL',
  SEMI_FINALS: 'SEMIFINAL',
  FINAL: 'FINAL',
};

const getRoundKey = (match: any) => `${match.stage ?? 'UNKNOWN'}-${match.matchday ?? 'X'}`;

const getRoundLabel = (match: any) => {
  const stage = match.stage as string | null;
  const base = (stage && STAGE_LABELS[stage]) || (stage ? stage.replace(/_/g, ' ') : 'RODADA');

  if (stage && NUMBERED_ROUND_STAGES.includes(stage) && match.matchday != null) {
    return `${base} ${match.matchday}`;
  }
  if (match.matchday === 1) return `${base} - IDA`;
  if (match.matchday === 2) return `${base} - VOLTA`;
  return base;
};

type DayGroup = { date: string; matches: any[] };
type RoundGroup = { key: string; label: string; days: DayGroup[] };

const groupMatchesIntoRounds = (matches: any[]): RoundGroup[] => {
  const rounds = new Map<string, RoundGroup>();

  for (const match of matches) {
    const roundKey = getRoundKey(match);
    if (!rounds.has(roundKey)) {
      rounds.set(roundKey, { key: roundKey, label: getRoundLabel(match), days: [] });
    }
    const round = rounds.get(roundKey)!;

    const dayLabel = new Date(match.kickoffTime).toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long'
    });
    let day = round.days.find(d => d.date === dayLabel);
    if (!day) {
      day = { date: dayLabel, matches: [] };
      round.days.push(day);
    }
    day.matches.push(match);
  }

  return Array.from(rounds.values());
};

export default function CompetitionDetails() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [competition, setCompetition] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States for handling predictions UI
  const [scores, setScores] = useState<Record<string, { home: string, away: string }>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const scoresRef = useRef(scores);
  const lastSaved = useRef<Record<string, { home: string, away: string }>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const matchRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasAutoScrolled = useRef(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Round/day grouping and collapse state
  const groupedRounds = useMemo(() => groupMatchesIntoRounds(matches), [matches]);
  const [collapsedRounds, setCollapsedRounds] = useState<Record<string, boolean>>({});
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const [collapseInitialized, setCollapseInitialized] = useState(false);

  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('cravei_token');
    if (!token) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    const fetchAll = async () => {
      try {
        // 1. Fetch competition
        const compRes = await fetch(`${API_BASE_URL}/api/competitions/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const compData = await compRes.json();

        if (!compRes.ok) throw new Error('Competição não encontrada');
        setCompetition(compData);

        // Join the competition if the user isn't a member yet (e.g. arrived via a shared link)
        await fetch(`${API_BASE_URL}/api/competitions/${id}/join`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        // 2. Fetch matches for this championship
        const matchesRes = await fetch(`${API_BASE_URL}/api/matches?championshipId=${compData.championshipId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const matchesData = await matchesRes.json();
        setMatches(matchesData);

        // 3. Fetch user predictions
        const predRes = await fetch(`${API_BASE_URL}/api/matches/my-predictions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const predData = await predRes.json();
        setPredictions(predData);

        // Pre-fill scores with existing predictions
        const initialScores: Record<string, { home: string, away: string }> = {};
        matchesData.forEach((m: any) => {
          const pred = predData.find((p: any) => p.matchId === m.id);
          if (pred) {
            const saved = {
              home: pred.predictedHomeScore.toString(),
              away: pred.predictedAwayScore.toString()
            };
            initialScores[m.id] = saved;
            lastSaved.current[m.id] = saved;
          }
        });
        setScores(initialScores);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [id]);

  // Collapse rounds/days that are entirely in the past by default
  useEffect(() => {
    if (collapseInitialized || loading || groupedRounds.length === 0) return;

    const now = new Date();
    const initialCollapsedRounds: Record<string, boolean> = {};
    const initialCollapsedDays: Record<string, boolean> = {};

    for (const round of groupedRounds) {
      let roundPast = true;
      for (const day of round.days) {
        const dayPast = day.matches.every(m => new Date(m.kickoffTime) < now);
        initialCollapsedDays[`${round.key}::${day.date}`] = dayPast;
        if (!dayPast) roundPast = false;
      }
      initialCollapsedRounds[round.key] = roundPast;
    }

    setCollapsedRounds(initialCollapsedRounds);
    setCollapsedDays(initialCollapsedDays);
    setCollapseInitialized(true);
  }, [loading, groupedRounds, collapseInitialized]);

  // Auto-scroll to the next predictable match, once the collapse state above has settled
  useEffect(() => {
    if (hasAutoScrolled.current || !collapseInitialized) return;

    const now = new Date();
    const nextPredictable = matches.find(m => new Date(m.kickoffTime) > now);

    if (nextPredictable) {
      matchRefs.current[nextPredictable.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    hasAutoScrolled.current = true;
  }, [collapseInitialized, matches]);

  const toggleRound = (key: string) => {
    setCollapsedRounds(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleDay = (key: string) => {
    setCollapsedDays(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for contexts without the Clipboard API (e.g. plain HTTP on a LAN IP)
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const savePrediction = async (matchId: string, home: string, away: string) => {
    const token = localStorage.getItem('cravei_token');
    setSaveStatus(prev => ({ ...prev, [matchId]: 'saving' }));

    try {
      const res = await fetch(`${API_BASE_URL}/api/matches/${matchId}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          predictedHomeScore: parseInt(home),
          predictedAwayScore: parseInt(away)
        })
      });

      if (!res.ok) throw new Error();

      lastSaved.current[matchId] = { home, away };
      setSaveStatus(prev => ({ ...prev, [matchId]: 'saved' }));
    } catch (err) {
      console.error(err);
      setSaveStatus(prev => ({ ...prev, [matchId]: 'error' }));
    }
  };

  const handleScoreChange = (matchId: string, team: 'home' | 'away', val: string) => {
    setScores(prev => {
      const updated = { ...prev[matchId], [team]: val };
      return { ...prev, [matchId]: updated };
    });

    if (saveTimers.current[matchId]) clearTimeout(saveTimers.current[matchId]);

    saveTimers.current[matchId] = setTimeout(() => {
      const score = scoresRef.current[matchId];
      if (!score?.home || !score?.away) return;

      const saved = lastSaved.current[matchId];
      if (!saved || saved.home !== score.home || saved.away !== score.away) {
        savePrediction(matchId, score.home, score.away);
      }
    }, 600);
  };

  if (loading) return <div className="container page display" style={{ fontSize: '2rem' }}>CARREGANDO...</div>;
  if (!competition) return (
    <div className="container page">
      <BackButton />
      <div className="display" style={{ fontSize: '2rem' }}>COMPETIÇÃO NÃO ENCONTRADA.</div>
    </div>
  );

  return (
    <div className="container page">
      <div className="competition-bar">
        <span className="competition-bar-name">{competition.name.toUpperCase()}</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {linkCopied && (
            <span className="prediction-status-saved display" style={{ fontSize: '0.85rem' }}>
              LINK COPIADO!
            </span>
          )}
          <button className="btn btn-outline" onClick={handleCopyLink}>
            COPIAR LINK
          </button>
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button className="btn btn-outline" onClick={() => setMenuOpen(o => !o)}>
              ☰ MENU
            </button>
            {menuOpen && (
              <div className="dropdown-menu">
                <a className="dropdown-item" href={`/competitions/${id}/ranking`}>
                  CLASSIFICAÇÃO
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <BackButton />
      <p className="text-large accent-text" style={{ marginBottom: '3rem' }}>
        {competition.championship.name.toUpperCase()}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {groupedRounds.map(round => {
          const roundCollapsed = !!collapsedRounds[round.key];

          return (
            <div key={round.key} className="round-group">
              <button className="round-header" onClick={() => toggleRound(round.key)}>
                <h2 className="display">{round.label}</h2>
                <span className="collapse-icon">{roundCollapsed ? '▸' : '▾'}</span>
              </button>

              {!roundCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {round.days.map(day => {
                    const dayKey = `${round.key}::${day.date}`;
                    const dayCollapsed = !!collapsedDays[dayKey];

                    return (
                      <div key={dayKey} className="day-group">
                        <button className="day-header" onClick={() => toggleDay(dayKey)}>
                          <span className="day-label">{day.date.toUpperCase()}</span>
                          <span className="collapse-icon">{dayCollapsed ? '▸' : '▾'}</span>
                        </button>

                        {!dayCollapsed && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {day.matches.map(match => {
                              const hasStarted = new Date() >= new Date(match.kickoffTime);

                              return (
                                <div
                                  key={match.id}
                                  ref={el => { matchRefs.current[match.id] = el; }}
                                  className="match-card match-card-clickable"
                                  onClick={() => router.push(`/competitions/${id}/matches/${match.id}`)}
                                >
                                  {/* Match Info */}
                                  <div className="match-info">
                                    <p className="match-meta">
                                      {new Date(match.kickoffTime).toLocaleString('pt-BR')} | STATUS: {match.status}
                                    </p>
                                    <div className="match-teams">
                                      <span className="team team-home">
                                        {match.homeTeamName}
                                        {match.homeTeamLogo && (
                                          <Image src={match.homeTeamLogo} alt={match.homeTeamName} width={32} height={32} unoptimized className="team-crest" />
                                        )}
                                      </span>
                                      <span className="match-vs">VS</span>
                                      <span className="team team-away">
                                        {match.awayTeamLogo && (
                                          <Image src={match.awayTeamLogo} alt={match.awayTeamName} width={32} height={32} unoptimized className="team-crest" />
                                        )}
                                        {match.awayTeamName}
                                      </span>
                                    </div>
                                    {match.status === 'FINISHED' && (
                                      <div className="match-result">
                                        RESULTADO OFICIAL: {match.homeScore} x {match.awayScore}
                                      </div>
                                    )}
                                  </div>

                                  {/* Prediction Inputs */}
                                  <div
                                    style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <input
                                      type="number"
                                      className="score-input"
                                      disabled={hasStarted}
                                      value={scores[match.id]?.home || ''}
                                      onChange={e => handleScoreChange(match.id, 'home', e.target.value)}
                                    />
                                    <span className="display muted" style={{ fontSize: '1.5rem' }}>X</span>
                                    <input
                                      type="number"
                                      className="score-input"
                                      disabled={hasStarted}
                                      value={scores[match.id]?.away || ''}
                                      onChange={e => handleScoreChange(match.id, 'away', e.target.value)}
                                    />
                                  </div>

                                  {/* Prediction save status */}
                                  <div className="prediction-status" style={{ minWidth: '140px', textAlign: 'center' }}>
                                    {hasStarted ? (
                                      <span className="muted">ENCERRADO</span>
                                    ) : saveStatus[match.id] === 'saving' ? (
                                      <span className="muted">SALVANDO...</span>
                                    ) : saveStatus[match.id] === 'saved' ? (
                                      <span className="prediction-status-saved">PALPITE SALVO ✓</span>
                                    ) : saveStatus[match.id] === 'error' ? (
                                      <span className="prediction-status-error">ERRO AO SALVAR</span>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
