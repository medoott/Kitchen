import { Request, Response } from 'express';
import QRCode from 'qrcode';
import prisma from '../lib/db.js';

function getStorefrontBaseUrl(): string {
  return process.env.STOREFRONT_URL?.replace(/\/$/, '') || 'http://localhost:5174';
}

export function buildTableOrderUrl(qrToken: string): string {
  return `${getStorefrontBaseUrl()}/table/${qrToken}`;
}

// Public: resolve a table by its QR token (used by the storefront to load the menu)
export async function getTableByToken(req: Request<{ token: string }>, res: Response): Promise<void> {
  const { token } = req.params;
  if (!token) {
    res.status(400).json({ success: false, error: 'Missing token' });
    return;
  }

  const table = await prisma.table.findFirst({
    where: { qrToken: token, isActive: true },
    include: {
      location: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!table) {
    res.status(404).json({ success: false, error: 'Invalid or inactive table QR code' });
    return;
  }

  res.json({
    success: true,
    data: {
      id: table.id,
      name: table.name,
      capacity: table.capacity,
      status: table.status,
      qrToken: table.qrToken,
      locationId: table.locationId,
      locationName: table.location?.name ?? null,
      orderUrl: buildTableOrderUrl(table.qrToken),
    },
  });
}

// Admin/Staff: generate a PNG QR code image for a table
export async function getTableQrImage(req: Request<{ tableId: string }>, res: Response): Promise<void> {
  const { tableId } = req.params;

  const table = await prisma.table.findUnique({ where: { id: tableId } });
  if (!table) {
    res.status(404).json({ success: false, error: 'Table not found' });
    return;
  }

  const url = buildTableOrderUrl(table.qrToken);
  const png = await QRCode.toBuffer(url, {
    type: 'png',
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'M',
  });

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-store');
  res.send(png);
}
