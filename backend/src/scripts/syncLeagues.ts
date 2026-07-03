import prisma from '../prismaClient';
import { fetchCompetitionData } from '../services/footballData';

// football-data.org identifies competitions by both a numeric id and a short code.
const TARGET_LEAGUES = [
  { code: 'BSA', name: 'Brasileirão' },
  { code: 'PL', name: 'Premier League' },
  { code: 'PD', name: 'La Liga' },
  { code: 'FL1', name: 'Ligue 1' },
  { code: 'CL', name: 'Champions League' },
  { code: 'CLI', name: 'Libertadores' },
];

// football-data.org's free tier allows 10 requests/minute.
const REQUEST_DELAY_MS = 6500;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const syncLeagues = async () => {
  console.log('Starting league sync...');

  for (const league of TARGET_LEAGUES) {
    try {
      console.log(`Fetching league data for: ${league.name} (${league.code})`);
      const data = await fetchCompetitionData(league.code);

      if (data && data.id) {
        await prisma.championship.upsert({
          where: { apiId: data.id },
          update: {
            name: data.name,
            logoUrl: data.emblem,
          },
          create: {
            apiId: data.id,
            name: data.name,
            logoUrl: data.emblem,
          }
        });

        console.log(`Successfully synced: ${data.name}`);
      } else {
        console.warn(`No data found for competition: ${league.code}`);
      }
    } catch (error) {
      console.error(`Error syncing competition ${league.code}:`, error);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  console.log('League sync complete!');
  process.exit(0);
};

syncLeagues();
