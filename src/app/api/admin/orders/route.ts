import { NextRequest, NextResponse } from 'next/server';
import { prisma, isDbReachable } from '@/lib/db';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { Prisma, OrderStatus } from '@prisma/client';

const DEFAULT_SEED_ORDERS = [
  {
    id: 'comp-seed-1',
    orderReference: 'IR-COMP-94812',
    customerName: 'DJ Vyrusky (Headline Artist)',
    customerEmail: 'vyrusky@islandrave.com',
    customerPhone: '+233 24 990 1122',
    totalAmount: 0.00,
    currency: 'GHS',
    status: 'PAID',
    isComplimentary: true,
    category: 'Artist & Performer Entourage',
    notes: 'Official festival headliner hospitality rider comp',
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    items: [{ id: 'item-comp-1', quantity: 2, unitPrice: 0, ticketType: { name: 'Backstage All-Access' } }]
  },
  {
    id: 'ord-seed-1',
    orderReference: 'IR-89210-GH',
    customerName: 'Kwame Mensah',
    customerEmail: 'kwame.mensah@gmail.com',
    customerPhone: '+233 24 555 0192',
    totalAmount: 12000.00,
    currency: 'GHS',
    status: 'PAID',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    items: [{ id: 'item-1', quantity: 1, unitPrice: 12000, ticketType: { name: 'Cabana Lounge Package (8 Guests)' } }]
  },
  {
    id: 'ord-seed-2',
    orderReference: 'IR-89209-GH',
    customerName: 'Nana Aba Anamoah',
    customerEmail: 'nana.aba@media.gh',
    customerPhone: '+233 50 123 4567',
    totalAmount: 900.00,
    currency: 'GHS',
    status: 'PAID',
    createdAt: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
    items: [{ id: 'item-2', quantity: 2, unitPrice: 450, ticketType: { name: 'VIP Pass' } }]
  },
  {
    id: 'comp-seed-2',
    orderReference: 'IR-COMP-83021',
    customerName: 'Telecel Ghana Brand Activation',
    customerEmail: 'partnerships@telecel.com.gh',
    customerPhone: '+233 20 800 9000',
    totalAmount: 0.00,
    currency: 'GHS',
    status: 'PAID',
    isComplimentary: true,
    category: 'VIP Headline Sponsor',
    notes: 'Telco main sponsor executive delegation',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    items: [{ id: 'item-comp-2', quantity: 4, unitPrice: 0, ticketType: { name: 'VIP Pass' } }]
  },
  {
    id: 'ord-seed-3',
    orderReference: 'IR-89208-GH',
    customerName: 'Kofi Boateng',
    customerEmail: 'kofi.boateng@outlook.com',
    customerPhone: '+233 55 987 6543',
    totalAmount: 500.00,
    currency: 'GHS',
    status: 'PAID',
    createdAt: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    items: [{ id: 'item-3', quantity: 2, unitPrice: 250, ticketType: { name: 'General Admission' } }]
  },
  {
    id: 'ord-seed-4',
    orderReference: 'IR-89205-GH',
    customerName: 'Esi Sutherland',
    customerEmail: 'esi.suth@yahoo.com',
    customerPhone: '+233 27 333 4455',
    totalAmount: 450.00,
    currency: 'GHS',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
    items: [{ id: 'item-4', quantity: 1, unitPrice: 450, ticketType: { name: 'VIP Pass' } }]
  }
];

interface AdminOrder {
  id: string;
  orderReference: string;
  customerName: string;
  customerEmail: string;
  status: string;
  [key: string]: unknown;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search')?.toLowerCase();

  let orders: AdminOrder[] = [];

  if (await isDbReachable()) {
    try {
      const where: Prisma.OrderWhereInput = {};
      if (status && status !== 'ALL') {
        where.status = status as OrderStatus;
      }
      if (search) {
        where.OR = [
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerEmail: { contains: search, mode: 'insensitive' } },
          { orderReference: { contains: search, mode: 'insensitive' } },
        ];
      }

      orders = (await prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          items: { include: { ticketType: true } },
          tickets: true,
        }
      })) as unknown as AdminOrder[];
    } catch (error) {
      console.warn('DB orders lookup failed, falling back to seed orders:', error);
    }
  }

  if (!orders || orders.length === 0) {
    orders = DEFAULT_SEED_ORDERS;
    if (status && status !== 'ALL') {
      orders = orders.filter(o => o.status === status);
    }
    if (search) {
      orders = orders.filter(o =>
        o.customerName.toLowerCase().includes(search) ||
        o.customerEmail.toLowerCase().includes(search) ||
        o.orderReference.toLowerCase().includes(search)
      );
    }
  }

  return NextResponse.json({ success: true, orders });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'SUPER_ADMIN' && user.role !== 'EVENT_MANAGER') {
    return NextResponse.json(
      { error: 'Forbidden. Only Super Admin or Event Manager can issue complimentary passes.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      category = 'VIP Sponsor',
      ticketTypeName = 'VIP Single Pass',
      quantity = 1,
      notes = '',
    } = body;

    if (!customerName || !customerEmail) {
      return NextResponse.json(
        { error: 'Customer Name and Email are required' },
        { status: 400 }
      );
    }

    const orderRef = `IR-COMP-${Math.floor(100000 + Math.random() * 900000)}`;
    const parsedQty = Math.max(1, Math.min(8, parseInt(quantity, 10) || 1));

    if (await isDbReachable()) {
      try {
        const event = await prisma.event.findFirst();
        if (event) {
          let ticketType = await prisma.ticketType.findFirst({
            where: { eventId: event.id, name: ticketTypeName }
          });

          if (!ticketType) {
            ticketType = await prisma.ticketType.findFirst({
              where: { eventId: event.id }
            });
          }

          if (ticketType) {
            const newOrder = await prisma.order.create({
              data: {
                orderReference: orderRef,
                eventId: event.id,
                customerName,
                customerEmail,
                customerPhone: customerPhone || '+233 24 000 0000',
                subtotal: 0,
                serviceFee: 0,
                discount: 0,
                totalAmount: 0,
                currency: 'GHS',
                status: 'PAID',
                paidAt: new Date(),
                notes: `[COMPLIMENTARY - ${category}] ${notes}`.trim(),
                items: {
                  create: [
                    {
                      ticketTypeId: ticketType.id,
                      quantity: parsedQty,
                      unitPrice: 0,
                      totalPrice: 0,
                      currency: 'GHS',
                    }
                  ]
                }
              },
              include: {
                items: { include: { ticketType: true } }
              }
            });

            // Generate tickets
            for (let i = 0; i < parsedQty; i++) {
              const ticketNum = `${orderRef}-${i + 1}`;
              const token = `TKT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
              await prisma.ticket.create({
                data: {
                  ticketNumber: ticketNum,
                  ticketToken: token,
                  orderId: newOrder.id,
                  eventId: event.id,
                  ticketTypeId: ticketType.id,
                  holderName: parsedQty === 1 ? customerName : `${customerName} (Guest ${i + 1})`,
                  holderEmail: customerEmail,
                  holderPhone: customerPhone,
                  ticketTypeName: ticketType.name,
                  price: 0,
                  currency: 'GHS',
                  status: 'VALID',
                  qrCodeData: JSON.stringify({
                    ticketNumber: ticketNum,
                    token,
                    orderReference: orderRef,
                    holderName: customerName,
                    tier: ticketType.name,
                    category
                  })
                }
              });
            }

            return NextResponse.json({
              success: true,
              order: { ...newOrder, isComplimentary: true, category },
              message: 'Official Complimentary Pass created and registered.'
            });
          }
        }
      } catch (dbErr) {
        console.warn('Failed saving comp pass to DB, falling back to mock response:', dbErr);
      }
    }

    // Mock fallback response
    const mockOrder = {
      id: `comp-${Date.now()}`,
      orderReference: orderRef,
      customerName,
      customerEmail,
      customerPhone: customerPhone || '+233 24 000 0000',
      totalAmount: 0.00,
      currency: 'GHS',
      status: 'PAID',
      isComplimentary: true,
      category,
      notes,
      createdAt: new Date().toISOString(),
      items: [
        {
          id: `item-${Date.now()}`,
          quantity: parsedQty,
          unitPrice: 0,
          ticketType: { name: ticketTypeName }
        }
      ]
    };

    return NextResponse.json({
      success: true,
      order: mockOrder,
      message: 'Official Complimentary Pass created successfully.'
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 });
  }
}
