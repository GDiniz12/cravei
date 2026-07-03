import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { nickname, password } = req.body;
    const existing = await prisma.user.findUnique({ where: { nickname } });
    if (existing) {
      return res.status(400).json({ error: 'Nickname already taken' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { nickname, passwordHash }
    });
    res.status(201).json({ id: user.id, nickname: user.nickname });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { nickname, password } = req.body;
    const user = await prisma.user.findUnique({ where: { nickname } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // No expiresIn: the user stays logged in on this device until they clear storage.
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret');
    res.json({ token, user: { id: user.id, nickname: user.nickname } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to login' });
  }
});

export default router;
