import { NextResponse } from 'next/server';
import { prisma, isDbReachable } from '@/lib/db';
import { getCurrentUser, isAdmin } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (await isDbReachable()) {
    try {
      const [ordersCount, paidOrders, ticketsCount, checkInsCount, ticketTypes] = await Promise.all([
        prisma.order.count(),
        prisma.order.findMany({
          where: { status: 'PAID' },
          select: { totalAmount: true }
        }),
        prisma.ticket.count(),
        prisma.checkIn.count(),
        prisma.ticketType.findMany({
          orderBy: { sortOrder: 'asc' }
        })
      ]);

      const totalRevenue = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);

      return NextResponse.json({
        success: true,
        stats: {
          totalRevenue,
          ordersCount,
          ticketsSold: ticketsCount,
          checkInsCount,
          totalCapacity: 5000,
          ticketTypes,
        }
      });
    } catch (error) {
      console.warn('DB query failed for admin stats, returning preview metrics:', error);
    }
  }

  // Graceful fallback for UI preview without database connection
  return NextResponse.json({
    success: true,
    stats: {
      totalRevenue: 0.00,
      ordersCount: 0,
      ticketsSold: 0,
      checkInsCount: 0,
      totalCapacity: 5000,
      ticketTypes: [
        { id: 'tt-1', name: 'General Admission', price: 250, soldQuantity: 0, totalQuantity: 300, status: 'ACTIVE' },
        { id: 'tt-2', name: 'VIP Tropical Pass', price: 400, soldQuantity: 0, totalQuantity: 150, status: 'ACTIVE' },
        { id: 'tt-3', name: 'Cabana Lounge Package', price: 1500, soldQuantity: 0, totalQuantity: 20, status: 'ACTIVE' },
      ]
    }
  });
}
