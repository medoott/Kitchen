import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const expo = new Expo();

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5174'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    // Join order-specific room for customers tracking their order
    socket.on('join:order', (orderId: string) => {
      socket.join(`order:${orderId}`);
    });

    socket.on('leave:order', (orderId: string) => {
      socket.leave(`order:${orderId}`);
    });

    // Join kitchen room for staff viewing kitchen display
    socket.on('join:kitchen', () => {
      socket.join('kitchen');
    });

    socket.on('leave:kitchen', () => {
      socket.leave('kitchen');
    });

    // Join a table room (shared table ordering + waiter calls)
    socket.on('join:table', (tableId: string) => {
      if (typeof tableId === 'string' && tableId.length) {
        socket.join(tableRoom(tableId));
      }
    });

    socket.on('leave:table', (tableId: string) => {
      if (typeof tableId === 'string' && tableId.length) {
        socket.leave(tableRoom(tableId));
      }
    });
  });

  return io;
}

function tableRoom(tableId: string): string {
  return `table:${tableId}`;
}

export function emitTableCartUpdate(tableId: string, payload: unknown): void {
  if (!io) return;
  io.to(tableRoom(tableId)).emit('table:cartUpdate', payload);
}

export function emitCallWaiter(request: {
  id: string;
  tableId: string;
  tableName?: string;
  status: string;
  createdAt: string | Date;
}): void {
  if (!io) return;
  io.to(tableRoom(request.tableId)).emit('table:callWaiter', request);
  io.to('kitchen').emit('table:callWaiter', request);
}

export function emitCallWaiterUpdate(request: {
  id: string;
  tableId: string;
  status: string;
  completedAt?: string | Date | null;
}): void {
  if (!io) return;
  io.to(tableRoom(request.tableId)).emit('table:callWaiterUpdate', request);
  io.to('kitchen').emit('table:callWaiterUpdate', request);
}

export function emitTableStatusUpdate(table: {
  id: string;
  status: string;
  name?: string;
}): void {
  if (!io) return;
  io.to(tableRoom(table.id)).emit('table:statusUpdate', table);
  io.to('kitchen').emit('table:statusUpdate', table);
}

export function emitTableOrderUpdate(tableId: string, order: unknown): void {
  if (!io) return;
  io.to(tableRoom(tableId)).emit('table:orderUpdate', order);
  io.to('kitchen').emit('table:orderUpdate', order);
}

export function getIO(): Server | null {
  return io;
}

export function emitOrderStatusUpdate(order: {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  customerId?: string | null;
}): void {
  if (!io) return;
  // Notify the specific order room (customer tracking)
  io.to(`order:${order.id}`).emit('order:statusUpdate', order);
  // Notify the kitchen display
  io.to('kitchen').emit('order:statusUpdate', order);

  // Send push notification to the customer
  if (order.customerId) {
    sendPushNotification(order.customerId, order.orderNumber, order.status).catch(() => {});
  }
}

async function sendPushNotification(
  customerId: string,
  orderNumber: string,
  status: string,
): Promise<void> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { expoPushToken: true },
  });

  if (!customer?.expoPushToken || !Expo.isExpoPushToken(customer.expoPushToken)) {
    return;
  }

  const statusLabels: Record<string, string> = {
    CONFIRMED: 'confirmed',
    PREPARING: 'being prepared',
    READY: 'ready',
    OUT_FOR_DELIVERY: 'out for delivery',
    DELIVERED: 'delivered',
    PICKED_UP: 'picked up',
    CANCELLED: 'cancelled',
  };

  const statusLabel = statusLabels[status] || status.toLowerCase();

  const message: ExpoPushMessage = {
    to: customer.expoPushToken,
    title: `Order #${orderNumber}`,
    body: `Your order is ${statusLabel}.`,
    data: { orderId: customerId, status },
    sound: 'default',
  };

  await expo.sendPushNotificationsAsync([message]);
}

export function emitNewOrder(order: {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
}): void {
  if (!io) return;
  io.to('kitchen').emit('order:new', order);
}
