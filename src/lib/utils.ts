import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { config } from './config';

// ============================================
// Order Reference Generator
// ============================================

export function generateOrderReference(): string {
  const year = new Date().getFullYear();
  const random = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  return `${config.order.referencePrefix}-${year}-${timestamp}${random}`;
}

// ============================================
// Ticket Number Generator
// ============================================

export function generateTicketNumber(): string {
  const random = uuidv4().replace(/-/g, '').substring(0, 10).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  return `${config.ticket.qrPrefix}-${timestamp}${random}`;
}

// ============================================
// Ticket Token Generator (for QR codes)
// ============================================

export function generateTicketToken(): string {
  return uuidv4() + '-' + uuidv4();
}

// ============================================
// Payment Reference Generator
// ============================================

export function generatePaymentReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
  return `PAY-${timestamp}-${random}`;
}

// ============================================
// QR Code Generator
// ============================================

export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    });
    return qrDataUrl;
  } catch (error) {
    console.error('QR Code generation failed:', error);
    throw new Error('Failed to generate QR code');
  }
}

// ============================================
// QR Verification URL
// ============================================

export function getTicketVerificationUrl(ticketToken: string): string {
  return `${config.app.url}/api/tickets/verify/${ticketToken}`;
}

// ============================================
// Slug Generator
// ============================================

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

// ============================================
// Currency Formatter
// ============================================

export function formatCurrency(amount: number, currency: string = 'GHS'): string {
  return `${currency} ${amount.toFixed(2)}`;
}

// ============================================
// Date Formatter
// ============================================

export function formatDate(date: Date | string | null): string {
  if (!date) return 'Date Coming Soon';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTime(time: string | null): string {
  if (!time || time === 'Time Coming Soon') return '8:00 PM GMT';
  return time;
}

// ============================================
// Service Fee Calculator
// ============================================

export function calculateServiceFee(subtotal: number): number {
  const percentFee = subtotal * (config.payment.serviceFeePercent / 100);
  return Math.round((percentFee + config.payment.serviceFeeFixed) * 100) / 100;
}
