import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/db.js';

export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    ordersToday,
    revenueToday,
    ordersThisWeek,
    revenueThisWeek,
    ordersThisMonth,
    revenueThisMonth,
    totalOrders,
    totalRevenue,
    activeItems,
    totalCustomers,
    pendingReservations,
    pendingReviews,
    recentOrders,
    topItems,
  ] = await Promise.all([
    // Orders today
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    // Revenue today
    prisma.order.aggregate({
      where: { createdAt: { gte: todayStart }, status: { not: 'CANCELLED' } },
      _sum: { total: true },
    }),
    // Orders this week
    prisma.order.count({ where: { createdAt: { gte: weekStart } } }),
    // Revenue this week
    prisma.order.aggregate({
      where: { createdAt: { gte: weekStart }, status: { not: 'CANCELLED' } },
      _sum: { total: true },
    }),
    // Orders this month
    prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
    // Revenue this month
    prisma.order.aggregate({
      where: { createdAt: { gte: monthStart }, status: { not: 'CANCELLED' } },
      _sum: { total: true },
    }),
    // Total orders
    prisma.order.count(),
    // Total revenue
    prisma.order.aggregate({
      where: { status: { not: 'CANCELLED' } },
      _sum: { total: true },
    }),
    // Active menu items
    prisma.menuItem.count({ where: { isActive: true } }),
    // Total customers
    prisma.customer.count(),
    // Pending reservations
    prisma.reservation.count({ where: { status: 'PENDING' } }),
    // Pending reviews
    prisma.review.count({ where: { isApproved: false } }),
    // Recent orders (last 5)
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        orderType: true,
        createdAt: true,
        customer: { select: { name: true } },
      },
    }),
    // Top selling items (by order item count)
    prisma.orderItem.groupBy({
      by: ['menuItemId', 'name'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
  ]);

  res.json({
    success: true,
    data: {
      metrics: {
        ordersToday,
        revenueToday: revenueToday._sum.total || 0,
        ordersThisWeek,
        revenueThisWeek: revenueThisWeek._sum.total || 0,
        ordersThisMonth,
        revenueThisMonth: revenueThisMonth._sum.total || 0,
        totalOrders,
        totalRevenue: totalRevenue._sum.total || 0,
        activeItems,
        totalCustomers,
        pendingReservations,
        pendingReviews,
      },
      recentOrders,
      topItems: topItems.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        totalQuantity: item._sum.quantity || 0,
      })),
    },
  });
}

export async function getAnalytics(req: Request, res: Response): Promise<void> {
  const days = Math.min(90, Math.max(7, parseInt(req.query.days as string) || 30));
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Daily revenue and order counts
  const dailyStats = await prisma.$queryRaw<{ date: string; orders: bigint; revenue: number }[]>(
    Prisma.sql`
      SELECT
        TO_CHAR("createdAt"::date, 'YYYY-MM-DD') AS date,
        COUNT(*)::bigint AS orders,
        COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total ELSE 0 END), 0) AS revenue
      FROM "orders"
      WHERE "createdAt" >= ${startDate}
      GROUP BY "createdAt"::date
      ORDER BY "createdAt"::date
    `
  );

  // Order type distribution
  const orderTypeDistribution = await prisma.order.groupBy({
    by: ['orderType'],
    where: { createdAt: { gte: startDate } },
    _count: true,
  });

  // Order status distribution
  const orderStatusDistribution = await prisma.order.groupBy({
    by: ['status'],
    where: { createdAt: { gte: startDate } },
    _count: true,
  });

  // Hourly order distribution (for pattern analysis)
  const hourlyDistribution = await prisma.$queryRaw<{ hour: number; orders: bigint }[]>(
    Prisma.sql`
      SELECT
        EXTRACT(HOUR FROM "createdAt")::int AS hour,
        COUNT(*)::bigint AS orders
      FROM "orders"
      WHERE "createdAt" >= ${startDate}
      GROUP BY EXTRACT(HOUR FROM "createdAt")
      ORDER BY hour
    `
  );

  // Top categories by revenue
  const categoryRevenue = await prisma.$queryRaw<{ name: string; revenue: number; orders: bigint }[]>(
    Prisma.sql`
      SELECT
        c.name,
        COALESCE(SUM(oi.subtotal), 0) AS revenue,
        COUNT(DISTINCT o.id)::bigint AS orders
      FROM "order_items" oi
      JOIN "menu_items" mi ON oi."menuItemId" = mi.id
      JOIN "categories" c ON mi."categoryId" = c.id
      JOIN "orders" o ON oi."orderId" = o.id
      WHERE o."createdAt" >= ${startDate} AND o.status != 'CANCELLED'
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
      LIMIT 10
    `
  );

  res.json({
    success: true,
    data: {
      dailyStats: dailyStats.map((d) => ({
        date: d.date,
        orders: Number(d.orders),
        revenue: Number(d.revenue),
      })),
      orderTypeDistribution: orderTypeDistribution.map((d) => ({
        type: d.orderType,
        count: d._count,
      })),
      orderStatusDistribution: orderStatusDistribution.map((d) => ({
        status: d.status,
        count: d._count,
      })),
      hourlyDistribution: hourlyDistribution.map((d) => ({
        hour: d.hour,
        orders: Number(d.orders),
      })),
      categoryRevenue: categoryRevenue.map((d) => ({
        name: d.name,
        revenue: Number(d.revenue),
        orders: Number(d.orders),
      })),
    },
  });
}
