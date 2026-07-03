import { Router, Response } from 'express';
import prisma from '../prismaClient';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate as any);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { championshipId } = req.query;
    
    if (!championshipId || typeof championshipId !== 'string') {
      return res.status(400).json({ error: 'championshipId é obrigatório' });
    }

    const matches = await prisma.match.findMany({
      where: { championshipId },
      orderBy: { kickoffTime: 'asc' }
    });

    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar partidas' });
  }
});

router.post('/:matchId/predict', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const matchId = req.params.matchId as string;
    const { predictedHomeScore, predictedAwayScore } = req.body;

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return res.status(404).json({ error: 'Partida não encontrada' });
    
    if (new Date() >= match.kickoffTime) {
      return res.status(400).json({ error: 'A partida já começou' });
    }

    const prediction = await prisma.prediction.upsert({
      where: {
        userId_matchId: {
          userId,
          matchId
        }
      },
      update: {
        predictedHomeScore: Number(predictedHomeScore),
        predictedAwayScore: Number(predictedAwayScore)
      },
      create: {
        userId,
        matchId,
        predictedHomeScore: Number(predictedHomeScore),
        predictedAwayScore: Number(predictedAwayScore)
      }
    });

    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar palpite' });
  }
});

router.get('/my-predictions', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const predictions = await prisma.prediction.findMany({
      where: { userId }
    });
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar palpites' });
  }
});

export default router;
