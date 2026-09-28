import { NextRequest, NextResponse } from 'next/server';
import { getPaymentGateway } from '@/lib/services/payment-gateway';
import { fulfillOrder } from '@/lib/services/order-service';
import { prisma, isDbReachable } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const reference = searchParams.get('reference') || searchParams.get('trxref');

  if (!reference) {
    return NextResponse.json({ error: 'Missing payment reference' }, { status: 400 });
  }

  try {
    const gateway = getPaymentGateway();
    const result = await gateway.verify(reference);

    if (result.success && result.status === 'success') {
      let orderRef = reference;

      if (await isDbReachable()) {
        try {
          const payment = await prisma.payment.findUnique({
            where: { paymentReference: reference },
            include: { order: true },
          });

          if (payment) {
            orderRef = payment.order.orderReference;
            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: 'PAID',
                paidAt: new Date(),
                gatewayReference: result.gatewayReference || reference,
                channel: result.channel || payment.channel,
                cardType: result.cardType,
                last4: result.last4,
                bank: result.bank,
              },
            });

            await fulfillOrder(reference);
          }
        } catch (dbErr) {
          console.warn('DB update during payment verification skipped:', dbErr);
        }
      }

      return NextResponse.json({
        success: true,
        status: 'PAID',
        reference,
        orderReference: orderRef,
      });
    }

    return NextResponse.json({
      success: false,
      status: result.status || 'FAILED',
      reference,
      error: result.error || 'Payment was not successful',
    }, { status: 400 });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ error: 'Failed to verify transaction with payment gateway' }, { status: 500 });
  }
}
