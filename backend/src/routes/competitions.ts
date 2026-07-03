import { Router, Response } from 'express';
import prisma from '../prismaClient';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate as any);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userCompetitions = await prisma.competitionMember.findMany({
      where: { userId },
      include: {
        competition: {
          include: {
            championship: true,
            members: {
              include: {
                user: { select: { id: true, nickname: true } }
              }
            }
          }
        }
      }
    });

    res.json(userCompetitions.map(mc => mc.competition));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar competições' });
  }
});

router.get('/championships', async (req: AuthRequest, res: Response) => {
  try {
    const championships = await prisma.championship.findMany();
    res.json(championships);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar ligas' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const competition = await prisma.competition.findUnique({
      where: { id: id as string },
      include: {
        championship: true,
        members: {
          include: {
            user: { select: { id: true, nickname: true } }
          }
        }
      }
    });

    if (!competition) return res.status(404).json({ error: 'Competição não encontrada' });
    res.json(competition);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar competição' });
  }
});

router.post('/:id/join', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const competition = await prisma.competition.findUnique({ where: { id: id as string } });
    if (!competition) return res.status(404).json({ error: 'Competição não encontrada' });

    const member = await prisma.competitionMember.upsert({
      where: { userId_competitionId: { userId, competitionId: id as string } },
      update: {},
      create: { userId, competitionId: id as string }
    });

    res.json(member);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao entrar na competição' });
  }
});

router.get('/:id/matches/:matchId/predictions', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id, matchId } = req.params;

    const competition = await prisma.competition.findUnique({ where: { id: id as string } });
    if (!competition) return res.status(404).json({ error: 'Competição não encontrada' });

    const match = await prisma.match.findUnique({ where: { id: matchId as string } });
    if (!match || match.championshipId !== competition.championshipId) {
      return res.status(404).json({ error: 'Partida não encontrada nesta competição' });
    }

    const members = await prisma.competitionMember.findMany({
      where: { competitionId: id as string },
      include: { user: { select: { id: true, nickname: true } } }
    });
    const memberUserIds = members.map(m => m.userId);

    const allPredictions = await prisma.prediction.findMany({
      where: { matchId: matchId as string, userId: { in: memberUserIds } },
      include: { user: { select: { id: true, nickname: true } } }
    });

    // Predictions stay hidden from everyone but their author until kickoff,
    // so nobody can copy someone else's pick before making their own.
    const hasStarted = new Date() >= match.kickoffTime;
    const mine = allPredictions.find(p => p.userId === userId) ?? null;

    let predictions: any[] = [];
    let stats: any = null;

    if (hasStarted) {
      predictions = allPredictions.map(p => ({
        userId: p.userId,
        nickname: p.user.nickname,
        predictedHomeScore: p.predictedHomeScore,
        predictedAwayScore: p.predictedAwayScore,
        isSelf: p.userId === userId,
      }));

      const total = allPredictions.length;
      if (total > 0) {
        const homeWins = allPredictions.filter(p => p.predictedHomeScore > p.predictedAwayScore).length;
        const draws = allPredictions.filter(p => p.predictedHomeScore === p.predictedAwayScore).length;
        const awayWins = total - homeWins - draws;

        const avgHomeGoals = allPredictions.reduce((sum, p) => sum + p.predictedHomeScore, 0) / total;
        const avgAwayGoals = allPredictions.reduce((sum, p) => sum + p.predictedAwayScore, 0) / total;

        const scoreCounts = new Map<string, number>();
        for (const p of allPredictions) {
          const key = `${p.predictedHomeScore}-${p.predictedAwayScore}`;
          scoreCounts.set(key, (scoreCounts.get(key) ?? 0) + 1);
        }
        let mostCommon: { home: number; away: number; count: number } | null = null;
        for (const [key, count] of scoreCounts) {
          if (!mostCommon || count > mostCommon.count) {
            const [home, away] = key.split('-').map(Number);
            mostCommon = { home, away, count };
          }
        }

        let accuracy: { exact: number; winner: number; wrong: number } | null = null;
        if (match.status === 'FINISHED' && match.homeScore != null && match.awayScore != null) {
          let exact = 0, winner = 0, wrong = 0;
          const actualResult = Math.sign(match.homeScore - match.awayScore);
          for (const p of allPredictions) {
            if (p.predictedHomeScore === match.homeScore && p.predictedAwayScore === match.awayScore) {
              exact++;
            } else if (Math.sign(p.predictedHomeScore - p.predictedAwayScore) === actualResult) {
              winner++;
            } else {
              wrong++;
            }
          }
          accuracy = { exact, winner, wrong };
        }

        stats = {
          total,
          homeWinPct: Math.round((homeWins / total) * 100),
          drawPct: Math.round((draws / total) * 100),
          awayWinPct: Math.round((awayWins / total) * 100),
          avgHomeGoals: Math.round(avgHomeGoals * 10) / 10,
          avgAwayGoals: Math.round(avgAwayGoals * 10) / 10,
          mostCommonScore: mostCommon ? { ...mostCommon, pct: Math.round((mostCommon.count / total) * 100) } : null,
          accuracy,
        };
      }
    }

    res.json({
      match,
      hasStarted,
      totalMembers: members.length,
      submittedCount: allPredictions.length,
      myPrediction: mine ? {
        predictedHomeScore: mine.predictedHomeScore,
        predictedAwayScore: mine.predictedAwayScore,
      } : null,
      predictions,
      stats,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar palpites da partida' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, championshipId } = req.body;

    const competition = await prisma.competition.create({
      data: {
        name,
        creatorId: userId,
        championshipId,
        members: {
          create: {
            userId
          }
        }
      }
    });

    res.status(201).json(competition);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar competição' });
  }
});

export default router;
