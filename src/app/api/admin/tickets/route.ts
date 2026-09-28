import { NextRequest, NextResponse } from 'next/server';
import { prisma, isDbReachable } from '@/lib/db';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { getSharedTiers, saveSharedTier, deleteSharedTier, TierItem } from '@/lib/tiers-store';
import { TicketTypeStatus } from '@prisma/client';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (await isDbReachable()) {
    try {
      const dbTiers = await prisma.ticketType.findMany({
        orderBy: { sortOrder: 'asc' },
      });
      if (dbTiers && dbTiers.length > 0) {
        return NextResponse.json({ success: true, tiers: dbTiers });
      }
    } catch (err) {
      console.warn('DB lookup failed for ticket tiers:', err);
    }
  }

  return NextResponse.json({ success: true, tiers: getSharedTiers() });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const newTier: TierItem = {
      id: body.id || 'tier-' + Date.now(),
      name: body.name || 'New Tier',
      description: body.description || '',
      price: Number(body.price) || 100,
      currency: body.currency || 'GHS',
      totalQuantity: Number(body.totalQuantity) || 100,
      soldQuantity: Number(body.soldQuantity) || 0,
      maxPerCustomer: Number(body.maxPerCustomer) || 5,
      isEarlyBird: Boolean(body.isEarlyBird),
      status: body.status || 'ACTIVE',
    };

    const updatedTiers = saveSharedTier(newTier);

    if (await isDbReachable()) {
      try {
        const firstEvent = await prisma.event.findFirst();
        if (firstEvent) {
          await prisma.ticketType.upsert({
            where: { id: newTier.id },
            update: {
              name: newTier.name,
              description: newTier.description,
              price: newTier.price,
              totalQuantity: newTier.totalQuantity,
              status: newTier.status as TicketTypeStatus,
              isEarlyBird: newTier.isEarlyBird,
            },
            create: {
              id: newTier.id,
              eventId: firstEvent.id,
              name: newTier.name,
              description: newTier.description,
              price: newTier.price,
              currency: newTier.currency,
              totalQuantity: newTier.totalQuantity,
              soldQuantity: newTier.soldQuantity,
              status: newTier.status as TicketTypeStatus,
              isEarlyBird: newTier.isEarlyBird,
            },
          });
        }
      } catch (err) {
        console.warn('DB upsert for ticket tier skipped:', err);
      }
    }

    return NextResponse.json({ success: true, tier: newTier, tiers: updatedTiers });
  } catch (error) {
    console.error('Failed to create/update tier:', error);
    return NextResponse.json({ error: 'Failed to save tier' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Tier ID is required' }, { status: 400 });
  }

  const remainingTiers = deleteSharedTier(id);

  if (await isDbReachable()) {
    try {
      await prisma.ticketType.delete({ where: { id } });
    } catch (err) {
      console.warn('DB delete for ticket tier skipped:', err);
    }
  }

  return NextResponse.json({ success: true, tiers: remainingTiers });
}
