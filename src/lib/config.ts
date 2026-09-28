// ============================================
// Island Rave - Application Configuration
// ============================================
// Centralized configuration from environment variables
// Edit these values in .env for customization
// ============================================

export const config = {
  app: {
    name: 'Island Rave',
    url: process.env.APP_URL || 'http://localhost:3000',
    env: process.env.NODE_ENV || 'development',
  },
  
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    cookieName: 'ir_session',
    cookieMaxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  },
  
  payment: {
    mode: (process.env.PAYMENT_MODE || 'demo') as 'demo' | 'live',
    paystack: {
      publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
      secretKey: process.env.PAYSTACK_SECRET_KEY || '',
      webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || '',
      baseUrl: 'https://api.paystack.co',
    },
    currency: 'GHS',
    serviceFeePercent: 0, // Can be configured
    serviceFeeFixed: 0,
  },
  
  email: {
    from: process.env.EMAIL_FROM || 'Island Rave <noreply@islandrave.com>',
    provider: process.env.EMAIL_PROVIDER || 'console',
    apiKey: process.env.EMAIL_API_KEY || '',
    host: process.env.EMAIL_HOST || '',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
  
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@islandrave.com',
    password: process.env.ADMIN_PASSWORD || '',
  },
  
  staff: {
    email: process.env.STAFF_EMAIL || 'gate@islandrave.com',
    password: process.env.STAFF_PASSWORD || 'GateScanner2026!',
  },
  
  manager: {
    email: process.env.MANAGER_EMAIL || 'manager@islandrave.com',
    password: process.env.MANAGER_PASSWORD || 'RaveManager2026!',
  },
  
  finance: {
    email: process.env.FINANCE_EMAIL || 'finance@islandrave.com',
    password: process.env.FINANCE_PASSWORD || 'RaveFinance2026!',
  },
  
  ticket: {
    reservationTimeMinutes: 15,
    qrPrefix: 'IR',
  },
  
  order: {
    referencePrefix: 'IR',
  },
} as const;

// Validate critical config in production
export function validateConfig(): string[] {
  const errors: string[] = [];
  
  if (config.app.env === 'production') {
    if (config.auth.jwtSecret === 'dev-secret-change-in-production') {
      errors.push('JWT_SECRET must be changed for production');
    }
    if (config.payment.mode === 'live') {
      if (!config.payment.paystack.secretKey) {
        errors.push('PAYSTACK_SECRET_KEY is required for live payments');
      }
      if (!config.payment.paystack.publicKey) {
        errors.push('PAYSTACK_PUBLIC_KEY is required for live payments');
      }
    }
  }
  
  return errors;
}
