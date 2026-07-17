import prisma from '../prismaClient';
import { fetchMatches } from '../services/footballData';

const TARGET_LEAGUES = [
  { code: 'BSA', name: 'Brasileirão' },
  { code: 'PL', name: 'Premier League' },
  { code: 'PD', name: 'La Liga' },
  { code: 'FL1', name: 'Ligue 1' },
  { code: 'CL', name: 'Champions League' },
  { code: 'CLI', name: 'Libertadores' },
];

// football-data.org labels a season by the year it starts in.
const CURRENT_SEASON = 2026;

// football-data.org's free tier allows 10 requests/minute.
const REQUEST_DELAY_MS = 6500;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const runMatchSync = async () => {
  console.log(`Starting match sync for season ${CURRENT_SEASON}...`);

  for (const league of TARGET_LEAGUES) {
    try {
      console.log(`Fetching matches for: ${league.name} (${league.code})`);

      const data = await fetchMatches(league.code, CURRENT_SEASON);

      if (!data.competition || !data.matches) {
        console.warn(`No match data returned for competition: ${league.code}`);
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      // First ensure the championship exists in our DB
      const championship = await prisma.championship.findUnique({
        where: { apiId: data.competition.id }
      });

      if (!championship) {
        console.warn(`Championship with API ID ${data.competition.id} not found in DB. Run syncLeagues first.`);
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      let syncedCount = 0;
      let skippedCount = 0;

      for (const match of data.matches) {
        // Future knockout-stage fixtures (e.g. a cup quarterfinal) can have
        // undetermined teams until earlier rounds finish. Skip until known.
        if (!match.homeTeam?.name || !match.awayTeam?.name) {
          skippedCount++;
          continue;
        }

        const homeScore = match.score?.fullTime?.home ?? null;
        const awayScore = match.score?.fullTime?.away ?? null;

        await prisma.match.upsert({
          where: { apiId: match.id },
          update: {
            kickoffTime: new Date(match.utcDate),
            homeScore,
            awayScore,
            status: match.status, // e.g. "SCHEDULED", "FINISHED"
            matchday: match.matchday,
            stage: match.stage,
            group: match.group,
          },
          create: {
            apiId: match.id,
            championshipId: championship.id,
            homeTeamName: match.homeTeam.name,
            homeTeamLogo: match.homeTeam.crest,
            awayTeamName: match.awayTeam.name,
            awayTeamLogo: match.awayTeam.crest,
            kickoffTime: new Date(match.utcDate),
            homeScore,
            awayScore,
            status: match.status,
            matchday: match.matchday,
            stage: match.stage,
            group: match.group,
          }
        });
        syncedCount++;
      }

      console.log(`Successfully synced ${syncedCount} matches for ${league.name}${skippedCount > 0 ? ` (skipped ${skippedCount} with undetermined teams)` : ''}`);
    } catch (error) {
      console.error(`Error syncing matches for competition ${league.code}:`, error);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  console.log('Match sync complete!');
};

// Only run automatically when invoked directly (`npm run sync:matches`), not
// when imported by the cron job.
if (require.main === module) {
  runMatchSync().then(() => process.exit(0));
}
