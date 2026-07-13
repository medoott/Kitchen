import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const pushTokenSchema = z.object({
  expoPushToken: z.string().min(1),
});

export async function savePushToken(req: Request, res: Response): Promise<void> {
  const parsed = pushTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid push token' });
    return;
  }

  const userId = req.user!.id;
  const { expoPushToken } = parsed.data;

  await prisma.customer.update({
    where: { id: userId },
    data: { expoPushToken },
  });

  res.json({ success: true, message: 'Push token saved' });
}
