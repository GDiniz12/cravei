import { Match, Prediction } from '@prisma/client';

type Outcome = 'exact' | 'winner' | 'wrong';

export interface MemberRankingStats {
  userId: string;
  nickname: string;
  totalPoints: number;
  predictionsCount: number;
  finishedCount: number;
  exactCount: number;
  winnerCount: number;
  wrongCount: number;
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

function classify(prediction: Prediction, match: Match): Outcome {
  if (prediction.predictedHomeScore === match.homeScore && prediction.predictedAwayScore === match.awayScore) {
    return 'exact';
  }
  const actualSign = Math.sign(match.homeScore! - match.awayScore!);
  const predictedSign = Math.sign(prediction.predictedHomeScore - prediction.predictedAwayScore);
  return predictedSign === actualSign ? 'winner' : 'wrong';
}

function pointsForOutcome(outcome: Outcome): number {
  return outcome === 'exact' ? 3 : outcome === 'winner' ? 1 : 0;
}

function rankMembers(memberIds: string[], pointsByUser: Map<string, number>): Map<string, number> {
  const sorted = [...memberIds].sort((a, b) => {
    const diff = (pointsByUser.get(b) ?? 0) - (pointsByUser.get(a) ?? 0);
    return diff !== 0 ? diff : a.localeCompare(b);
  });
  const rankByUser = new Map<string, number>();
  sorted.forEach((userId, index) => rankByUser.set(userId, index + 1));
  return rankByUser;
}

export function computeRankingStats(
  members: { userId: string; nickname: string }[],
  matches: Match[],
  predictions: Prediction[]
): MemberRankingStats[] {
  const now = new Date();
  const startedMatches = matches.filter(m => now >= m.kickoffTime);
  const finishedMatches = matches.filter(m => m.status === 'FINISHED' && m.homeScore != null && m.awayScore != null);
  const finishedMatchesDesc = [...finishedMatches].sort((a, b) => b.kickoffTime.getTime() - a.kickoffTime.getTime());

  const predictionsByUser = new Map<string, Prediction[]>();
  for (const p of predictions) {
    if (!predictionsByUser.has(p.userId)) predictionsByUser.set(p.userId, []);
    predictionsByUser.get(p.userId)!.push(p);
  }

  const distinctMatchdays = Array.from(
    new Set(finishedMatches.map(m => m.matchday).filter((md): md is number => md != null))
  ).sort((a, b) => a - b);
  const lastMatchday = distinctMatchdays[distinctMatchdays.length - 1];

  const memberIds = members.map(m => m.userId);
  const currentPointsByUser = new Map<string, number>();
  const priorPointsByUser = new Map<string, number>();

  const results: MemberRankingStats[] = members.map(({ userId, nickname }) => {
    const userPredictions = predictionsByUser.get(userId) ?? [];
    const predictionByMatchId = new Map(userPredictions.map(p => [p.matchId, p]));

    let totalPoints = 0;
    let priorPoints = 0;
    let exactCount = 0;
    let winnerCount = 0;
    let wrongCount = 0;
    const pointsByMatchday = new Map<number, number>();

    for (const match of finishedMatches) {
      const prediction = predictionByMatchId.get(match.id);
      const outcome: Outcome | null = prediction ? classify(prediction, match) : null;
      const points = outcome ? pointsForOutcome(outcome) : 0;

      totalPoints += points;
      if (match.matchday != null && match.matchday !== lastMatchday) priorPoints += points;

      if (outcome === 'exact') exactCount++;
      else if (outcome === 'winner') winnerCount++;
      else wrongCount++;

      if (match.matchday != null) {
        pointsByMatchday.set(match.matchday, (pointsByMatchday.get(match.matchday) ?? 0) + points);
      }
    }
    currentPointsByUser.set(userId, totalPoints);
    priorPointsByUser.set(userId, priorPoints);

    let currentStreak = 0;
    for (const match of finishedMatchesDesc) {
      const prediction = predictionByMatchId.get(match.id);
      const points = prediction ? pointsForOutcome(classify(prediction, match)) : 0;
      if (points <= 0) break;
      currentStreak++;
    }

    let bestMatchday: { matchday: number; points: number } | null = null;
    let worstMatchday: { matchday: number; points: number } | null = null;
    for (const [matchday, points] of pointsByMatchday) {
      if (!bestMatchday || points > bestMatchday.points) bestMatchday = { matchday, points };
      if (!worstMatchday || points < worstMatchday.points) worstMatchday = { matchday, points };
    }

    const scoreCounts = new Map<string, { home: number; away: number; count: number }>();
    for (const p of userPredictions) {
      const key = `${p.predictedHomeScore}-${p.predictedAwayScore}`;
      const entry = scoreCounts.get(key);
      if (entry) entry.count++;
      else scoreCounts.set(key, { home: p.predictedHomeScore, away: p.predictedAwayScore, count: 1 });
    }
    let favoriteScore: { home: number; away: number; count: number } | null = null;
    for (const entry of scoreCounts.values()) {
      if (!favoriteScore || entry.count > favoriteScore.count) favoriteScore = entry;
    }

    const finishedCount = exactCount + winnerCount + wrongCount;

    return {
      userId,
      nickname,
      totalPoints,
      predictionsCount: userPredictions.length,
      finishedCount,
      exactCount,
      winnerCount,
      wrongCount,
      cravadaPct: finishedCount > 0 ? Math.round((exactCount / finishedCount) * 100) : null,
      acertoPct: finishedCount > 0 ? Math.round((winnerCount / finishedCount) * 100) : null,
      aproveitamentoPct: finishedCount > 0 ? Math.round((totalPoints / (finishedCount * 3)) * 100) : null,
      currentStreak,
      participationPct: startedMatches.length > 0
        ? Math.round((finishedCount / startedMatches.length) * 100)
        : null,
      bestMatchday,
      worstMatchday,
      trend: null,
      trendDelta: null,
      favoriteScore,
    };
  });

  if (distinctMatchdays.length > 1) {
    const currentRank = rankMembers(memberIds, currentPointsByUser);
    const priorRank = rankMembers(memberIds, priorPointsByUser);

    for (const stats of results) {
      const current = currentRank.get(stats.userId)!;
      const prior = priorRank.get(stats.userId)!;
      const delta = prior - current;
      stats.trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'same';
      stats.trendDelta = delta;
    }
  }

  return results.sort((a, b) => b.totalPoints - a.totalPoints || a.nickname.localeCompare(b.nickname));
}
