import { NextRequest, NextResponse } from 'next/server';
import { prisma, isDbReachable } from '@/lib/db';
import { getSharedTiers } from '@/lib/tiers-store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (await isDbReachable()) {
    try {
      const event = await prisma.event.findUnique({
        where: { id },
        include: {
          ticketTypes: {
            where: { status: 'ACTIVE' },
            orderBy: { sortOrder: 'asc' }
          }
        }
      });

      if (event) {
        return NextResponse.json({ success: true, data: event });
      }
    } catch (error) {
      console.warn('Fetch event error, falling back to mock data:', error);
    }
  }

  const activeTiers = getSharedTiers()
    .filter(t => t.status === 'ACTIVE')
    .map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      price: t.price,
      currency: t.currency,
      maxPerCustomer: t.maxPerCustomer,
    }));

  return NextResponse.json({ 
    success: true, 
    data: {
      id,
      name: 'Island Rave',
      venueName: 'La Plage Beach Club, Accra',
      startTime: '8:00 PM GMT',
      eventDate: 'Saturday, 26 September 2026',
      posterUrl: 'https://images.unsplash.com/photo-1540039155732-68473682de40?auto=format&fit=crop&q=80&w=400',
      ticketTypes: activeTiers
    } 
  });
}
