import { prisma } from '../db';
import { CheckoutInput } from '../validations';
import {
  generateOrderReference,
  generatePaymentReference,
  generateTicketNumber,
  generateTicketToken,
  generateQRCode,
  calculateServiceFee,
} from '../utils';
import { config } from '../config';
import { getPaymentGateway } from './payment-gateway';
import { Prisma } from '@prisma/client';

// ============================================
// Order Service
// ============================================

export interface CreateOrderResult {
  success: boolean;
  orderId?: string;
  orderReference?: string;
  authorizationUrl?: string;
  paymentReference?: string;
  error?: string;
}

/**
 * Create an order with ticket reservation and payment initialization.
 * Uses database transactions to prevent overselling.
 */
export async function createOrder(
  input: CheckoutInput,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<CreateOrderResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate event exists and is published
      const event = await tx.event.findUnique({
        where: { id: input.eventId },
      });
      
      if (!event || event.status !== 'PUBLISHED') {
        throw new Error('Event is not available for ticket sales');
      }
      
      // 2. Validate and reserve tickets
      let subtotal = 0;
      const orderItems: {
        ticketTypeId: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }[] = [];
      
      for (const item of input.items) {
        const ticketType = await tx.ticketType.findUnique({
          where: { id: item.ticketTypeId },
        });
        
        if (!ticketType || ticketType.eventId !== input.eventId) {
          throw new Error(`Ticket type not found: ${item.ticketTypeId}`);
        }
        
        if (ticketType.status !== 'ACTIVE') {
          throw new Error(`Ticket type "${ticketType.name}" is not available`);
        }
        
        // Check early bird deadline
        if (ticketType.isEarlyBird && ticketType.earlyBirdDeadline) {
          if (new Date() > new Date(ticketType.earlyBirdDeadline)) {
            throw new Error(`Early-bird period for "${ticketType.name}" has ended`);
          }
        }
        
        // Check quantity limits
        if (item.quantity > ticketType.maxPerCustomer) {
          throw new Error(`Maximum ${ticketType.maxPerCustomer} tickets per customer for "${ticketType.name}"`);
        }
        
        // Check availability (use pessimistic locking via raw query)
        const available = ticketType.totalQuantity - ticketType.soldQuantity - ticketType.reservedQuantity;
        if (available < item.quantity) {
          throw new Error(`Only ${Math.max(0, available)} tickets available for "${ticketType.name}"`);
        }
        
        // Reserve tickets
        await tx.ticketType.update({
          where: { id: ticketType.id },
          data: {
            reservedQuantity: {
              increment: item.quantity,
            },
          },
        });
        
        const itemTotal = ticketType.price * item.quantity;
        subtotal += itemTotal;
        
        orderItems.push({
          ticketTypeId: ticketType.id,
          quantity: item.quantity,
          unitPrice: ticketType.price,
          totalPrice: itemTotal,
        });
      }
      
      // 3. Calculate fees
      const serviceFee = calculateServiceFee(subtotal);
      
      // 4. Apply discount if provided
      let discount = 0;
      let discountCodeId: string | undefined;
      
      if (input.discountCode) {
        const discountCode = await tx.discountCode.findFirst({
          where: {
            code: input.discountCode.toUpperCase(),
            eventId: input.eventId,
            isActive: true,
          },
        });
        
        if (discountCode) {
          const now = new Date();
          const validFrom = discountCode.validFrom ? new Date(discountCode.validFrom) : null;
          const validUntil = discountCode.validUntil ? new Date(discountCode.validUntil) : null;
          
          if ((!validFrom || now >= validFrom) && (!validUntil || now <= validUntil)) {
            if (!discountCode.maxUses || discountCode.usedCount < discountCode.maxUses) {
              if (!discountCode.minOrderAmount || subtotal >= discountCode.minOrderAmount) {
                if (discountCode.type === 'PERCENTAGE') {
                  discount = subtotal * (discountCode.value / 100);
                } else {
                  discount = Math.min(discountCode.value, subtotal);
                }
                
                discountCodeId = discountCode.id;
                
                await tx.discountCode.update({
                  where: { id: discountCode.id },
                  data: { usedCount: { increment: 1 } },
                });
              }
            }
          }
        }
      }
      
      const totalAmount = Math.max(0, subtotal + serviceFee - discount);
      
      // 5. Create order
      const orderReference = generateOrderReference();
      const reservedUntil = new Date(Date.now() + config.ticket.reservationTimeMinutes * 60 * 1000);
      
      const order = await tx.order.create({
        data: {
          orderReference,
          eventId: input.eventId,
          userId: userId || null,
          customerEmail: input.customerEmail,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          subtotal,
          serviceFee,
          discount,
          totalAmount,
          status: 'PENDING',
          reservedUntil,
          discountCodeId: discountCodeId || null,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          items: {
            create: orderItems,
          },
        },
      });
      
      // 6. Initialize payment
      const paymentReference = generatePaymentReference();
      const gateway = getPaymentGateway();
      
      // Configure Paystack channels based on preferred payment method
      let channels: string[] = ['card', 'mobile_money'];
      if (input.paymentMethod === 'card') {
        channels = ['card'];
      } else if (input.paymentMethod === 'bank_transfer') {
        channels = ['bank_transfer', 'bank'];
      } else if (['mtn_momo', 'telecel_cash', 'at_money'].includes(input.paymentMethod || '')) {
        channels = ['mobile_money'];
      }

      const paymentResult = await gateway.initialize({
        email: input.customerEmail,
        amount: Math.round(totalAmount * 100), // Convert to pesewas
        currency: 'GHS',
        reference: paymentReference,
        callbackUrl: `${config.app.url}/payment/callback?reference=${paymentReference}`,
        channels,
        metadata: {
          orderId: order.id,
          orderReference: order.orderReference,
          eventId: input.eventId,
          customerName: input.customerName,
          paymentMethod: input.paymentMethod || 'mtn_momo',
          momoPhoneNumber: input.momoPhoneNumber || input.customerPhone,
        },
      });
      
      // 7. Create payment record
      await tx.payment.create({
        data: {
          orderId: order.id,
          paymentReference,
          amount: totalAmount,
          currency: 'GHS',
          status: 'PENDING',
          provider: gateway.name,
          authorizationUrl: paymentResult.authorizationUrl,
          accessCode: paymentResult.accessCode,
          channel: input.paymentMethod || 'mtn_momo',
          mobileMoneyNumber: input.momoPhoneNumber || (input.paymentMethod !== 'card' ? input.customerPhone : null),
          metadata: JSON.stringify({
            paymentMethod: input.paymentMethod || 'mtn_momo',
            momoPhoneNumber: input.momoPhoneNumber || input.customerPhone,
          }),
        },
      });
      
      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment initialization failed');
      }
      
      return {
        success: true,
        orderId: order.id,
        orderReference: order.orderReference,
        authorizationUrl: paymentResult.authorizationUrl,
        paymentReference,
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 30000,
    });
    
    return result;
  } catch (error) {
    console.error('Order creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create order',
    };
  }
}

/**
 * Fulfill an order after successful payment.
 * Generates tickets with QR codes. Idempotent.
 */
export async function fulfillOrder(paymentReference: string): Promise<boolean> {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Find payment
      const payment = await tx.payment.findUnique({
        where: { paymentReference },
        include: {
          order: {
            include: {
              items: {
                include: {
                  ticketType: true,
                },
              },
              event: true,
            },
          },
        },
      });
      
      if (!payment) {
        console.error('Payment not found:', paymentReference);
        return false;
      }
      
      // 2. Check idempotency - don't fulfill twice
      if (payment.order.status === 'PAID') {
        console.log('Order already fulfilled:', payment.order.orderReference);
        return true; // Already fulfilled
      }
      
      // 3. Check existing tickets (extra idempotency)
      const existingTickets = await tx.ticket.count({
        where: { orderId: payment.orderId },
      });
      if (existingTickets > 0) {
        console.log('Tickets already generated for order:', payment.order.orderReference);
        return true;
      }
      
      // 4. Generate tickets
      for (const item of payment.order.items) {
        for (let i = 0; i < item.quantity; i++) {
          const ticketNumber = generateTicketNumber();
          const ticketToken = generateTicketToken();
          const qrData = `${config.app.url}/verify/${ticketToken}`;
          const qrCodeData = await generateQRCode(qrData);
          
          await tx.ticket.create({
            data: {
              ticketNumber,
              ticketToken,
              orderId: payment.orderId,
              eventId: payment.order.eventId,
              ticketTypeId: item.ticketTypeId,
              userId: payment.order.userId,
              holderName: payment.order.customerName,
              holderEmail: payment.order.customerEmail,
              holderPhone: payment.order.customerPhone,
              ticketTypeName: item.ticketType.name,
              price: item.unitPrice,
              currency: item.currency,
              status: 'VALID',
              qrCodeData,
            },
          });
        }
        
        // Update sold quantity and release reservation
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: {
            soldQuantity: { increment: item.quantity },
            reservedQuantity: { decrement: item.quantity },
          },
        });
      }
      
      // 5. Update order status
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          reservedUntil: null,
        },
      });
      
      // 6. Update payment status
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      });
      
      return true;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 30000,
    });
  } catch (error) {
    console.error('Order fulfillment failed:', error);
    return false;
  }
}

/**
 * Release expired reservations
 */
export async function releaseExpiredReservations(): Promise<number> {
  try {
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        reservedUntil: { lt: new Date() },
      },
      include: { items: true },
    });
    
    let releasedCount = 0;
    
    for (const order of expiredOrders) {
      await prisma.$transaction(async (tx) => {
        // Release reserved tickets
        for (const item of order.items) {
          await tx.ticketType.update({
            where: { id: item.ticketTypeId },
            data: {
              reservedQuantity: { decrement: item.quantity },
            },
          });
        }
        
        // Mark order as expired
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'EXPIRED' },
        });
        
        // Mark payment as cancelled
        await tx.payment.updateMany({
          where: { orderId: order.id, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
      });
      
      releasedCount++;
    }
    
    return releasedCount;
  } catch (error) {
    console.error('Failed to release expired reservations:', error);
    return 0;
  }
}
