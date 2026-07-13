import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { TableStatus } from '@prisma/client';
import prisma from '../lib/db.js';

const createTableSchema = z.object({
  name: z.string().min(1),
  capacity: z.number().int().min(1),
  isActive: z.boolean().default(true),
});

const updateTableSchema = createTableSchema
  .partial()
  .extend({
    status: z.nativeEnum(TableStatus).optional(),
  });


export async function listTables(req: Request<{ locationId: string }>, res: Response): Promise<void> {
  const { locationId } = req.params;

  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location) {
    res.status(404).json({ success: false, error: 'Location not found' });
    return;
  }

  const tables = await prisma.table.findMany({
    where: { locationId },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { reservations: true } },
    },
  });

  res.json({ success: true, data: tables });
}

export async function getTable(req: Request<{ locationId: string; tableId: string }>, res: Response): Promise<void> {
  const { locationId, tableId } = req.params;

  const table = await prisma.table.findFirst({
    where: { id: tableId, locationId },
    include: {
      _count: { select: { reservations: true } },
    },
  });

  if (!table) {
    res.status(404).json({ success: false, error: 'Table not found' });
    return;
  }

  res.json({ success: true, data: table });
}

export async function createTable(req: Request<{ locationId: string }>, res: Response): Promise<void> {
  const { locationId } = req.params;
  const parsed = createTableSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location) {
    res.status(404).json({ success: false, error: 'Location not found' });
    return;
  }

  // Check unique name within location
  const existing = await prisma.table.findFirst({
    where: { locationId, name: parsed.data.name },
  });
  if (existing) {
    res.status(409).json({ success: false, error: 'A table with this name already exists at this location' });
    return;
  }

  const table = await prisma.table.create({
    data: { locationId, qrToken: randomUUID(), status: TableStatus.AVAILABLE, ...parsed.data },
  });

  res.status(201).json({ success: true, data: table });
}

export async function regenerateQr(req: Request<{ locationId: string; tableId: string }>, res: Response): Promise<void> {
  const { locationId, tableId } = req.params;

  const table = await prisma.table.findFirst({ where: { id: tableId, locationId } });
  if (!table) {
    res.status(404).json({ success: false, error: 'Table not found' });
    return;
  }

  const updated = await prisma.table.update({
    where: { id: tableId },
    data: { qrToken: randomUUID() },
  });

  res.json({ success: true, data: updated });
}

export async function updateTableStatus(
  req: Request<{ locationId: string; tableId: string }>,
  res: Response,
): Promise<void> {
  const { locationId, tableId } = req.params;
  const parsed = z.object({ status: z.nativeEnum(TableStatus) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const table = await prisma.table.findFirst({ where: { id: tableId, locationId } });
  if (!table) {
    res.status(404).json({ success: false, error: 'Table not found' });
    return;
  }

  const updated = await prisma.table.update({
    where: { id: tableId },
    data: { status: parsed.data.status },
  });

  const { emitTableStatusUpdate } = await import('../lib/socket.js');
  emitTableStatusUpdate({ id: updated.id, status: updated.status, name: updated.name });

  res.json({ success: true, data: updated });
}

export async function updateTable(req: Request<{ locationId: string; tableId: string }>, res: Response): Promise<void> {
  const { locationId, tableId } = req.params;
  const parsed = updateTableSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const table = await prisma.table.findFirst({
    where: { id: tableId, locationId },
  });
  if (!table) {
    res.status(404).json({ success: false, error: 'Table not found' });
    return;
  }

  // If renaming, check uniqueness
  if (parsed.data.name && parsed.data.name !== table.name) {
    const duplicate = await prisma.table.findFirst({
      where: { locationId, name: parsed.data.name },
    });
    if (duplicate) {
      res.status(409).json({ success: false, error: 'A table with this name already exists at this location' });
      return;
    }
  }

  const updated = await prisma.table.update({
    where: { id: tableId },
    data: parsed.data,
  });

  if (parsed.data.status) {
    const { emitTableStatusUpdate } = await import('../lib/socket.js');
    emitTableStatusUpdate({ id: updated.id, status: updated.status, name: updated.name });
  }

  res.json({ success: true, data: updated });
}

export async function deleteTable(req: Request<{ locationId: string; tableId: string }>, res: Response): Promise<void> {
  const { locationId, tableId } = req.params;

  const table = await prisma.table.findFirst({
    where: { id: tableId, locationId },
  });
  if (!table) {
    res.status(404).json({ success: false, error: 'Table not found' });
    return;
  }

  const reservationCount = await prisma.reservation.count({
    where: { tableId },
  });
  if (reservationCount > 0) {
    res.status(409).json({
      success: false,
      error: 'Cannot delete table with existing reservations. Deactivate it instead.',
    });
    return;
  }

  await prisma.table.delete({ where: { id: tableId } });
  res.json({ success: true, message: 'Table deleted' });
}
