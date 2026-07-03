import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const footballData = axios.create({
  baseURL: 'https://api.football-data.org/v4',
  headers: {
    'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY || '',
  },
});

export const fetchCompetitionData = async (competitionCode: string) => {
  const response = await footballData.get(`/competitions/${competitionCode}`);
  return response.data;
};

export const fetchMatches = async (competitionCode: string, season: number) => {
  try {
    const response = await footballData.get(`/competitions/${competitionCode}/matches`, {
      params: { season }
    });
    return response.data;
  } catch (error: any) {
    // Some competitions (e.g. Champions League) haven't set up next season's
    // fixtures yet when this is called early in the year — fall back to
    // whatever season the API currently considers active.
    if (error.response?.status === 404) {
      console.warn(`Season ${season} not available for ${competitionCode}, falling back to current season`);
      const response = await footballData.get(`/competitions/${competitionCode}/matches`);
      return response.data;
    }
    throw error;
  }
};
