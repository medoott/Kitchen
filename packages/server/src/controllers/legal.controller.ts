import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';

const upsertPageSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

const createCategorySchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const updateCategorySchema = createCategorySchema.partial();

export async function listLegalPages(_req: Request, res: Response): Promise<void> {
  const pages = await prisma.legalPage.findMany({ orderBy: { createdAt: 'asc' } });
  res.json({ success: true, data: pages });
}

export async function getLegalPage(req: Request<{ slug: string }>, res: Response): Promise<void> {
  const page = await prisma.legalPage.findUnique({ where: { slug: req.params.slug } });
  if (!page) {
    res.status(404).json({ success: false, error: 'Page not found' });
    return;
  }
  res.json({ success: true, data: page });
}

export async function upsertLegalPage(req: Request<{ slug: string }>, res: Response): Promise<void> {
  const parsed = upsertPageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const { slug } = req.params;
  const page = await prisma.legalPage.upsert({
    where: { slug },
    update: { title: parsed.data.title, content: parsed.data.content },
    create: { slug, title: parsed.data.title, content: parsed.data.content },
  });

  res.json({ success: true, data: page });
}

export async function listCookieCategories(_req: Request, res: Response): Promise<void> {
  const categories = await prisma.cookieCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  res.json({ success: true, data: categories });
}

export async function createCookieCategory(req: Request, res: Response): Promise<void> {
  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const category = await prisma.cookieCategory.create({ data: parsed.data });
  res.status(201).json({ success: true, data: category });
}

export async function updateCookieCategory(req: Request<{ id: string }>, res: Response): Promise<void> {
  const parsed = updateCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const existing = await prisma.cookieCategory.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Cookie category not found' });
    return;
  }

  const category = await prisma.cookieCategory.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json({ success: true, data: category });
}

export async function deleteCookieCategory(req: Request<{ id: string }>, res: Response): Promise<void> {
  const existing = await prisma.cookieCategory.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Cookie category not found' });
    return;
  }

  await prisma.cookieCategory.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Cookie category deleted' });
}
