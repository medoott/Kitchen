import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';

const createReviewSchema = z.object({
  locationId: z.string().min(1),
  orderId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export async function createReview(req: Request, res: Response): Promise<void> {
  const parsed = createReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const customerId = req.user?.id;
  if (!customerId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const { locationId, orderId, rating, comment } = parsed.data;

  // Verify location exists
  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location) {
    res.status(400).json({ success: false, error: 'Location not found' });
    return;
  }

  const review = await prisma.review.create({
    data: {
      customerId,
      locationId,
      orderId,
      rating,
      comment,
    },
    include: {
      customer: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
    },
  });

  // Emit event for automation rules
  try {
    const { appEvents } = await import('../lib/events.js');
    appEvents.emit('review.submitted', { review });
  } catch {}

  res.status(201).json({ success: true, data: review });
}

export async function listReviews(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  const locationId = req.query.locationId as string | undefined;
  const isApproved = req.query.isApproved as string | undefined;

  const where: Record<string, unknown> = {};
  if (locationId) where.locationId = locationId;
  if (isApproved !== undefined) where.isApproved = isApproved === 'true';

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  res.json({
    success: true,
    data: reviews,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function getLocationReviews(req: Request<{ locationId: string }>, res: Response): Promise<void> {
  const { locationId } = req.params;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;

  const where = { locationId, isApproved: true };

  const [reviews, total, aggregate] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true } },
      },
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({
      where,
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  res.json({
    success: true,
    data: reviews,
    summary: {
      averageRating: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : null,
      totalReviews: aggregate._count,
    },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function moderateReview(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const { isApproved } = req.body;

  if (typeof isApproved !== 'boolean') {
    res.status(400).json({ success: false, error: 'isApproved must be a boolean' });
    return;
  }

  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Review not found' });
    return;
  }

  const review = await prisma.review.update({
    where: { id },
    data: { isApproved },
    include: {
      customer: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
    },
  });

  res.json({ success: true, data: review });
}

export async function deleteReview(req: Request<{ id: string }>, res: Response): Promise<void> {
  const existing = await prisma.review.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Review not found' });
    return;
  }

  await prisma.review.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Review deleted' });
}
