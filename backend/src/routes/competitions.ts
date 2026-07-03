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
