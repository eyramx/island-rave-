import { config } from '../config';
import crypto from 'crypto';

// ============================================
// Payment Gateway Adapter Interface
// ============================================

export interface PaymentInitializeParams {
  email: string;
  amount: number; // in smallest currency unit (pesewas for GHS)
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
  channels?: string[];
}

export interface PaymentInitializeResult {
  success: boolean;
  authorizationUrl?: string;
  accessCode?: string;
  reference: string;
  error?: string;
}

export interface PaymentVerifyResult {
  success: boolean;
  status: 'success' | 'failed' | 'abandoned' | 'pending';
  amount: number;
  currency: string;
  reference: string;
  gatewayReference?: string;
  channel?: string;
  cardType?: string;
  last4?: string;
  bank?: string;
  paidAt?: string;
  error?: string;
}

export interface PaymentGateway {
  name: string;
  initialize(params: PaymentInitializeParams): Promise<PaymentInitializeResult>;
  verify(reference: string): Promise<PaymentVerifyResult>;
  verifyWebhookSignature(body: string, signature: string): boolean;
}

// ============================================
// Paystack Gateway Implementation
// ============================================

export class PaystackGateway implements PaymentGateway {
  name = 'paystack';
  
  private secretKey: string;
  private baseUrl: string;
  
  constructor() {
    this.secretKey = config.payment.paystack.secretKey;
    this.baseUrl = config.payment.paystack.baseUrl;
  }
  
  async initialize(params: PaymentInitializeParams): Promise<PaymentInitializeResult> {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: params.email,
          amount: params.amount,
          currency: params.currency,
          reference: params.reference,
          callback_url: params.callbackUrl,
          metadata: params.metadata,
          channels: params.channels || ['card', 'mobile_money'],
        }),
      });
      
      const data = await response.json();
      
      if (!data.status) {
        return {
          success: false,
          reference: params.reference,
          error: data.message || 'Payment initialization failed',
        };
      }
      
      return {
        success: true,
        authorizationUrl: data.data.authorization_url,
        accessCode: data.data.access_code,
        reference: data.data.reference,
      };
    } catch (error) {
      console.error('Paystack initialize error:', error);
      return {
        success: false,
        reference: params.reference,
        error: 'Payment gateway connection failed',
      };
    }
  }
  
  async verify(reference: string): Promise<PaymentVerifyResult> {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
        },
      });
      
      const data = await response.json();
      
      if (!data.status) {
        return {
          success: false,
          status: 'failed',
          amount: 0,
          currency: 'GHS',
          reference,
          error: data.message,
        };
      }
      
      const txn = data.data;
      
      return {
        success: txn.status === 'success',
        status: txn.status,
        amount: txn.amount / 100, // Convert from pesewas
        currency: txn.currency,
        reference: txn.reference,
        gatewayReference: txn.id?.toString(),
        channel: txn.channel,
        cardType: txn.authorization?.card_type,
        last4: txn.authorization?.last4,
        bank: txn.authorization?.bank,
        paidAt: txn.paid_at,
      };
    } catch (error) {
      console.error('Paystack verify error:', error);
      return {
        success: false,
        status: 'failed',
        amount: 0,
        currency: 'GHS',
        reference,
        error: 'Payment verification failed',
      };
    }
  }
  
  verifyWebhookSignature(body: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(body)
      .digest('hex');
    return hash === signature;
  }
}

// ============================================
// Demo/Test Gateway Implementation
// ============================================

export class DemoGateway implements PaymentGateway {
  name = 'demo';
  
  async initialize(params: PaymentInitializeParams): Promise<PaymentInitializeResult> {
    // In demo mode, redirect to our own demo payment page with preferred payment details
    const paymentMethod = (params.metadata?.paymentMethod as string) || 'mtn_momo';
    const phone = (params.metadata?.momoPhoneNumber as string) || '';
    const callbackUrl = `${config.app.url}/payment/demo?reference=${params.reference}&amount=${params.amount}&currency=${params.currency}&paymentMethod=${paymentMethod}&phone=${encodeURIComponent(phone)}`;
    
    return {
      success: true,
      authorizationUrl: callbackUrl,
      accessCode: `demo_${params.reference}`,
      reference: params.reference,
    };
  }
  
  async verify(reference: string): Promise<PaymentVerifyResult> {
    // In demo mode, always return success when verify is called
    // The demo payment page will trigger this
    return {
      success: true,
      status: 'success',
      amount: 0, // Will be filled from order
      currency: 'GHS',
      reference,
      gatewayReference: `demo_${Date.now()}`,
      channel: 'demo',
      paidAt: new Date().toISOString(),
    };
  }
  
  verifyWebhookSignature(body: string, signature: string): boolean {
    void body;
    void signature;
    // Demo mode always accepts
    return true;
  }
}

// ============================================
// Gateway Factory
// ============================================

export function getPaymentGateway(): PaymentGateway {
  if (config.payment.mode === 'demo') {
    return new DemoGateway();
  }
  return new PaystackGateway();
}
