import { Request, Response } from 'express';
import { z } from 'zod';
import { CallWaiterStatus } from '@prisma/client';
import prisma from '../lib/db.js';
import { emitCallWaiter, emitCallWaiterUpdate } from '../lib/socket.js';

const updateCallWaiterSchema = z.object({ status: z.nativeEnum(CallWaiterStatus) });

// Public: a customer at a table calls the waiter (no login required)
export async function callWaiter(req: Request<{ token: string }>, res: Response): Promise<void> {
  const { token } = req.params;
  const { note } = req.body as { note?: string };

  const table = await prisma.table.findFirst({ where: { qrToken: token, isActive: true } });
  if (!table) {
    res.status(404).json({ success: false, error: 'Invalid or inactive table QR code' });
    return;
  }

  const request = await prisma.callWaiterRequest.create({
    data: {
      tableId: table.id,
      status: CallWaiterStatus.PENDING,
      note: note ?? null,
    },
  });

  const payload = {
    id: request.id,
    tableId: request.tableId,
    tableName: table.name,
    status: request.status,
    note: note ?? null,
    createdAt: request.createdAt,
  };

  emitCallWaiter(payload);

  res.status(201).json({ success: true, data: payload });
}

// Admin/Staff: list call-waiter requests (optionally scoped by location/table/status)
export async function listCallWaiter(req: Request, res: Response): Promise<void> {
  const locationId = req.query.locationId as string | undefined;
  const tableId = req.query.tableId as string | undefined;
  const status = req.query.status as string | undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (tableId) {
    where.tableId = tableId;
  } else if (locationId) {
    where.table = { locationId };
  }

  const requests = await prisma.callWaiterRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      table: { select: { id: true, name: true, locationId: true } },
    },
  });

  res.json({ success: true, data: requests });
}

// Admin/Staff: update the status of a call-waiter request
export async function updateCallWaiter(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const body = updateCallWaiterSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ success: false, error: body.error.errors });
    return;
  }

  const existing = await prisma.callWaiterRequest.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Request not found' });
    return;
  }

  const updated = await prisma.callWaiterRequest.update({
    where: { id },
    data: {
      status: body.data.status,
      completedAt: body.data.status === CallWaiterStatus.COMPLETED ? new Date() : null,
    },
  });

  emitCallWaiterUpdate({
    id: updated.id,
    tableId: updated.tableId,
    status: updated.status,
    completedAt: updated.completedAt,
  });

  res.json({ success: true, data: updated });
}
