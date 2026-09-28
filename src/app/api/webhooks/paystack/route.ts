import { NextRequest, NextResponse } from 'next/server';
import { getPaymentGateway } from '@/lib/services/payment-gateway';
import { fulfillOrder } from '@/lib/services/order-service';
import { prisma } from '@/lib/db';
import { sendOrderConfirmationEmail } from '@/lib/services/email-service';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const gateway = getPaymentGateway();
    
    // Verify webhook signature
    if (!gateway.verifyWebhookSignature(rawBody, signature)) {
      console.error('Webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    // Only process successful charges
    if (event.event === 'charge.success') {
      const paymentReference = event.data.reference;
      
      console.log(`Webhook received for payment: ${paymentReference}`);

      // Verify payment with gateway to ensure it's not a spoofed webhook
      const verifyResult = await gateway.verify(paymentReference);
      
      if (!verifyResult.success) {
        console.error(`Webhook verification failed for ${paymentReference}: ${verifyResult.error}`);
        return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
      }

      // Record webhook receipt to prevent duplicates
      let payment = null;
      try {
        payment = await prisma.payment.findUnique({
          where: { paymentReference },
          include: { 
            order: {
              include: {
                items: { include: { ticketType: true } },
                event: true
              }
            } 
          }
        });
      } catch (dbErr) {
        console.warn('Database not available for payment lookup:', dbErr);
      }

      if (!payment) {
        // If payment is in demo mode or reference contains MOCK/IR, accept gracefully
        if (paymentReference?.includes('MOCK') || paymentReference?.startsWith('IR-')) {
          console.log(`Demo webhook accepted for paymentReference: ${paymentReference}`);
          return NextResponse.json({ status: 'Success (Demo Mode)', reference: paymentReference }, { status: 200 });
        }
        return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
      }

      // Check if we already processed this exact webhook ID
      if (payment.webhookId === event.data.id?.toString()) {
        return NextResponse.json({ status: 'Already processed' }, { status: 200 });
      }

      // Save gateway reference and webhook ID
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          gatewayReference: event.data.id?.toString(),
          webhookReceivedAt: new Date(),
          webhookId: event.data.id?.toString(),
          channel: event.data.channel,
          metadata: JSON.stringify(event.data),
        }
      });

      // Fulfill order (idempotent operation)
      const fulfilled = await fulfillOrder(paymentReference);

      if (fulfilled && payment.order.status !== 'PAID') {
        // Send email only if it wasn't already PAID
        await sendOrderConfirmationEmail(payment.order.customerEmail, {
          orderReference: payment.order.orderReference,
          customerName: payment.order.customerName,
          totalAmount: payment.order.totalAmount,
          currency: payment.order.currency,
          eventName: payment.order.event.name,
          items: payment.order.items.map(item => ({
            name: item.ticketType.name,
            quantity: item.quantity,
            price: item.unitPrice,
          }))
        });
      }

      return NextResponse.json({ status: 'Success' }, { status: 200 });
    }

    // Acknowledge other events without processing
    return NextResponse.json({ status: 'Acknowledged' }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
