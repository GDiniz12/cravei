import { Match } from '@prisma/client';

// football-data.org free tier doesn't push live updates, so between kickoff
// and our next sync a match can sit at a stale "SCHEDULED" status even
// though it has clearly started. Estimate liveness from kickoff time so the
// UI never has to wait on a sync to stop showing "not started yet".
const ESTIMATED_MATCH_DURATION_MS = 2.25 * 60 * 60 * 1000; // regulation + stoppage + halftime buffer

export type MatchDisplayStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED';

export const getMatchDisplayStatus = (match: Pick<Match, 'status' | 'kickoffTime'>): MatchDisplayStatus => {
  if (match.status === 'FINISHED') return 'FINISHED';

  const now = Date.now();
  const kickoff = match.kickoffTime.getTime();
  if (now < kickoff) return 'SCHEDULED';
  if (now < kickoff + ESTIMATED_MATCH_DURATION_MS) return 'LIVE';

  // Kickoff was long enough ago that the match should be over, but our last
  // sync hasn't confirmed it yet — still better to say "live" than "scheduled".
  return 'LIVE';
};

export const withDisplayStatus = <T extends Pick<Match, 'status' | 'kickoffTime'>>(match: T) => ({
  ...match,
  displayStatus: getMatchDisplayStatus(match),
});
