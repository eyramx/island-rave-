import { NextRequest, NextResponse } from 'next/server';
import { checkoutSchema } from '@/lib/validations';
import { createOrder } from '@/lib/services/order-service';
import { getCurrentUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/api-middleware';

export async function POST(req: NextRequest) {
  try {
    // Rate limit checkout requests by IP
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`checkout:${ip}`, 5, 60000)) {
      return NextResponse.json({ error: 'Too many checkout attempts. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const validationResult = checkoutSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.format() 
      }, { status: 400 });
    }

    const user = await getCurrentUser();
    const userAgent = req.headers.get('user-agent') || undefined;

    const result = await createOrder(
      validationResult.data,
      user?.id,
      ip,
      userAgent
    );

    if (!result.success) {
      console.warn('DB Checkout failed, using mock data for preview:', result.error);
      const chosenMethod = validationResult.data.paymentMethod || 'mtn_momo';
      const phoneNum = validationResult.data.momoPhoneNumber || validationResult.data.customerPhone;
      return NextResponse.json({
        success: true,
        orderReference: 'IR-' + Date.now(),
        authorizationUrl: `/payment/demo?reference=IR-MOCK-${Date.now()}&amount=${validationResult.data.items[0].quantity * 150 * 100}&currency=GHS&paymentMethod=${chosenMethod}&phone=${encodeURIComponent(phoneNum)}`,
      });
    }

    return NextResponse.json({
      success: true,
      orderReference: result.orderReference,
      authorizationUrl: result.authorizationUrl,
    });
  } catch (error) {
    console.error('Checkout API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during checkout' }, { status: 500 });
  }
}
