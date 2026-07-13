import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { TableStatus } from '@prisma/client';
import prisma from '../lib/db.js';
import { emitTableCartUpdate, emitTableStatusUpdate } from '../lib/socket.js';

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  options?: unknown[];
  comment?: string;
}

function isCart(value: unknown): value is CartItem[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof (item as CartItem).menuItemId === 'string' &&
      typeof (item as CartItem).quantity === 'number' &&
      typeof (item as CartItem).price === 'number',
  );
}

// Public: get or create the active ordering session for a table (by QR token)
export async function createOrGetSession(req: Request, res: Response): Promise<void> {
  const { token } = req.body as { token?: string };
  if (!token) {
    res.status(400).json({ success: false, error: 'Missing table token' });
    return;
  }

  const table = await prisma.table.findFirst({ where: { qrToken: token, isActive: true } });
  if (!table) {
    res.status(404).json({ success: false, error: 'Invalid or inactive table QR code' });
    return;
  }

  let session = await prisma.tableSession.findFirst({
    where: { tableId: table.id, closedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!session) {
    session = await prisma.tableSession.create({
      data: {
        tableId: table.id,
        sessionToken: randomUUID(),
        status: TableStatus.ORDERING,
        cart: [],
      },
    });
    const updated = await prisma.table.update({
      where: { id: table.id },
      data: { status: TableStatus.OCCUPIED },
    });
    emitTableStatusUpdate({ id: updated.id, status: updated.status, name: updated.name });
  }

  res.json({
    success: true,
    data: {
      sessionToken: session.sessionToken,
      tableId: session.tableId,
      cart: (session.cart as unknown as CartItem[]) || [],
      status: session.status,
    },
  });
}

// Public: fetch an existing open session
export async function getSession(req: Request<{ sessionToken: string }>, res: Response): Promise<void> {
  const { sessionToken } = req.params;

  const session = await prisma.tableSession.findUnique({ where: { sessionToken } });
  if (!session || session.closedAt) {
    res.status(404).json({ success: false, error: 'Session not found or closed' });
    return;
  }

  res.json({
    success: true,
    data: {
      sessionToken: session.sessionToken,
      tableId: session.tableId,
      cart: (session.cart as unknown as CartItem[]) || [],
      status: session.status,
    },
  });
}

// Public: update the shared cart for a session
export async function updateCart(req: Request<{ sessionToken: string }>, res: Response): Promise<void> {
  const { sessionToken } = req.params;
  const { cart, tableId } = req.body as { cart?: unknown; tableId?: string };

  const session = await prisma.tableSession.findUnique({ where: { sessionToken } });
  if (!session || session.closedAt) {
    res.status(404).json({ success: false, error: 'Session not found or closed' });
    return;
  }
  if (tableId && session.tableId !== tableId) {
    res.status(403).json({ success: false, error: 'Session does not belong to this table' });
    return;
  }

  const safeCart = isCart(cart) ? cart : [];

  const updated = await prisma.tableSession.update({
    where: { sessionToken },
    data: { cart: safeCart as any, status: TableStatus.ORDERING },
  });

  emitTableCartUpdate(session.tableId, {
    sessionToken: updated.sessionToken,
    tableId: updated.tableId,
    cart: safeCart,
  });

  res.json({
    success: true,
    data: {
      sessionToken: updated.sessionToken,
      tableId: updated.tableId,
      cart: safeCart,
      status: updated.status,
    },
  });
}

// Admin/Staff: close a session (frees the table)
export async function closeSession(req: Request<{ sessionToken: string }>, res: Response): Promise<void> {
  const { sessionToken } = req.params;

  const session = await prisma.tableSession.findUnique({ where: { sessionToken } });
  if (!session) {
    res.status(404).json({ success: false, error: 'Session not found' });
    return;
  }

  await prisma.tableSession.update({
    where: { sessionToken },
    data: { closedAt: new Date(), status: TableStatus.CLOSED },
  });

  const openOrders = await prisma.order.count({
    where: { tableId: session.tableId, status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] } },
  });
  if (openOrders === 0) {
    const table = await prisma.table.update({
      where: { id: session.tableId },
      data: { status: TableStatus.AVAILABLE },
    });
    emitTableStatusUpdate({ id: table.id, status: table.status, name: table.name });
  }

  res.json({ success: true, message: 'Session closed' });
}
