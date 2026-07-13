import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';

export async function getBalance(req: Request, res: Response): Promise<void> {
  const customerId = req.user?.id;
  if (!customerId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { loyaltyPoints: true },
  });

  if (!customer) {
    res.status(404).json({ success: false, error: 'Customer not found' });
    return;
  }

  const transactions = await prisma.loyaltyTransaction.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      order: { select: { orderNumber: true } },
    },
  });

  res.json({
    success: true,
    data: {
      points: customer.loyaltyPoints,
      dollarValue: customer.loyaltyPoints / 100,
      transactions,
    },
  });
}

const redeemSchema = z.object({
  points: z.number().int().min(1),
});

export async function redeemPoints(req: Request, res: Response): Promise<void> {
  const customerId = req.user?.id;
  if (!customerId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const parsed = redeemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    res.status(404).json({ success: false, error: 'Customer not found' });
    return;
  }

  if (customer.loyaltyPoints < parsed.data.points) {
    res.status(400).json({ success: false, error: 'Insufficient points' });
    return;
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: { loyaltyPoints: { decrement: parsed.data.points } },
  });

  const transaction = await prisma.loyaltyTransaction.create({
    data: {
      customerId,
      type: 'REDEEM',
      points: -parsed.data.points,
      description: 'Points redeemed',
    },
  });

  res.json({
    success: true,
    data: {
      redeemed: parsed.data.points,
      remaining: customer.loyaltyPoints - parsed.data.points,
      transaction,
    },
  });
}

const adjustSchema = z.object({
  points: z.number().int(),
  description: z.string().optional(),
});

export async function adjustPoints(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id: customerId } = req.params;
  const parsed = adjustSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    res.status(404).json({ success: false, error: 'Customer not found' });
    return;
  }

  const newBalance = customer.loyaltyPoints + parsed.data.points;
  if (newBalance < 0) {
    res.status(400).json({ success: false, error: 'Adjustment would result in negative balance' });
    return;
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: { loyaltyPoints: newBalance },
  });

  const transaction = await prisma.loyaltyTransaction.create({
    data: {
      customerId,
      type: 'ADJUST',
      points: parsed.data.points,
      description: parsed.data.description || 'Manual adjustment',
    },
  });

  res.json({
    success: true,
    data: { points: newBalance, transaction },
  });
}
