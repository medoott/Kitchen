import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';

const consentEntrySchema = z.object({
  cookieCategoryId: z.string().min(1),
  accepted: z.boolean(),
});

const recordConsentSchema = z.object({
  consents: z.array(consentEntrySchema).min(1),
  customerId: z.string().optional(),
});

export async function recordConsent(req: Request, res: Response): Promise<void> {
  const parsed = recordConsentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const { consents, customerId } = parsed.data;
  const ipAddress = req.ip || req.socket.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;

  const records = await prisma.$transaction(
    consents.map((c) =>
      prisma.cookieConsent.create({
        data: {
          cookieCategoryId: c.cookieCategoryId,
          accepted: c.accepted,
          customerId: customerId || null,
          ipAddress,
          userAgent,
        },
      })
    )
  );

  res.status(201).json({ success: true, data: records });
}

export async function listConsents(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (req.query.categoryId) where.cookieCategoryId = req.query.categoryId;
  if (req.query.accepted !== undefined) where.accepted = req.query.accepted === 'true';

  const [consents, total] = await Promise.all([
    prisma.cookieConsent.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        cookieCategory: { select: { id: true, name: true, label: true } },
      },
    }),
    prisma.cookieConsent.count({ where }),
  ]);

  res.json({
    success: true,
    data: consents,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function consentStats(_req: Request, res: Response): Promise<void> {
  const categories = await prisma.cookieCategory.findMany({ orderBy: { sortOrder: 'asc' } });

  const stats = await Promise.all(
    categories.map(async (cat) => {
      const [total, accepted] = await Promise.all([
        prisma.cookieConsent.count({ where: { cookieCategoryId: cat.id } }),
        prisma.cookieConsent.count({ where: { cookieCategoryId: cat.id, accepted: true } }),
      ]);
      return {
        categoryId: cat.id,
        categoryName: cat.label,
        total,
        accepted,
        rejected: total - accepted,
        acceptanceRate: total > 0 ? Math.round((accepted / total) * 1000) / 10 : 0,
      };
    })
  );

  const totalConsents = stats.reduce((sum, s) => sum + s.total, 0);

  res.json({ success: true, data: { totalConsents, categories: stats } });
}
