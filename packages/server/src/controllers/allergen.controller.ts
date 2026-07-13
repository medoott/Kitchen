import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';

const createAllergenSchema = z.object({
  name: z.string().min(1),
});

export async function listAllergens(_req: Request, res: Response): Promise<void> {
  const allergens = await prisma.allergen.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { menuItems: true } } },
  });

  res.json({ success: true, data: allergens });
}

export async function createAllergen(req: Request, res: Response): Promise<void> {
  const parsed = createAllergenSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const existing = await prisma.allergen.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    res.status(409).json({ success: false, error: 'An allergen with this name already exists' });
    return;
  }

  const allergen = await prisma.allergen.create({ data: parsed.data });
  res.status(201).json({ success: true, data: allergen });
}

export async function deleteAllergen(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.allergen.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Allergen not found' });
    return;
  }

  await prisma.allergen.delete({ where: { id } });
  res.json({ success: true, message: 'Allergen deleted' });
}
