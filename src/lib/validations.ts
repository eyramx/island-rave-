import { z } from 'zod';

// ============================================
// Validation Schemas
// ============================================

// Customer checkout form
export const checkoutSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  items: z.array(z.object({
    ticketTypeId: z.string().min(1, 'Ticket type ID is required'),
    quantity: z.number().int().min(1).max(10),
  })).min(1),
  customerName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  customerEmail: z.string().email('Invalid email address'),
  customerPhone: z.string().min(9, 'Phone number is required').max(20),
  discountCode: z.string().optional(),
  paymentMethod: z.enum(['mtn_momo', 'telecel_cash', 'at_money', 'card', 'bank_transfer']).default('mtn_momo').optional(),
  momoPhoneNumber: z.string().optional(),
});

// User registration
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  phone: z.string().optional(),
});

// User login
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Event creation/update (admin)
export const eventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(200),
  slug: z.string().optional(),
  description: z.string().optional(),
  shortDescription: z.string().max(300).optional(),
  bannerUrl: z.string().url().optional().nullable(),
  posterUrl: z.string().url().optional().nullable(),
  venueName: z.string().min(1, 'Venue name is required'),
  venueAddress: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  googleMapsUrl: z.string().url().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  directions: z.string().optional(),
  eventDate: z.string().optional().nullable(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  doorsOpen: z.string().optional(),
  totalCapacity: z.number().int().min(1).optional().nullable(),
  organizerName: z.string().optional(),
  organizerEmail: z.string().email().optional().nullable(),
  organizerPhone: z.string().optional(),
  website: z.string().url().optional().nullable(),
  instagram: z.string().optional(),
  twitter: z.string().optional(),
  facebook: z.string().optional(),
  tiktok: z.string().optional(),
  refundPolicy: z.string().optional(),
  termsConditions: z.string().optional(),
  eventRules: z.string().optional(),
  ageRestriction: z.string().optional(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SOLD_OUT', 'CANCELLED', 'COMPLETED']).optional(),
});

// Ticket type creation/update (admin)
export const ticketTypeSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(1, 'Ticket name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be non-negative'),
  currency: z.string().default('GHS'),
  totalQuantity: z.number().int().min(1, 'Quantity must be at least 1'),
  maxPerCustomer: z.number().int().min(1).max(50).default(5),
  sortOrder: z.number().int().default(0),
  earlyBirdDeadline: z.string().optional().nullable(),
  isEarlyBird: z.boolean().default(false),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SOLD_OUT']).default('ACTIVE'),
  salesStartDate: z.string().optional().nullable(),
  salesEndDate: z.string().optional().nullable(),
});

// QR verification
export const verifyTicketSchema = z.object({
  ticketToken: z.string().min(1, 'Ticket token is required'),
});

// Check-in
export const checkInSchema = z.object({
  ticketToken: z.string().min(1, 'Ticket token is required'),
  location: z.string().optional(),
  notes: z.string().optional(),
});

// Discount code
export const discountCodeSchema = z.object({
  code: z.string().min(3).max(30),
  eventId: z.string().uuid(),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.number().min(0),
  maxUses: z.number().int().min(1).optional().nullable(),
  minOrderAmount: z.number().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
  validFrom: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
});

// Password reset
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type EventInput = z.infer<typeof eventSchema>;
export type TicketTypeInput = z.infer<typeof ticketTypeSchema>;
export type VerifyTicketInput = z.infer<typeof verifyTicketSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type DiscountCodeInput = z.infer<typeof discountCodeSchema>;
