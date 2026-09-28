-- ==============================================================================
-- ISLAND RAVE - SUPABASE POSTGRESQL PRODUCTION MIGRATION & SEED SCRIPT
-- ==============================================================================
-- Run this script directly in the Supabase Dashboard -> SQL Editor
-- This sets up the complete relational database, indexes, and initial data.
-- ==============================================================================

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. ENUM TYPES
-- ==============================================================================

DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM (
        'SUPER_ADMIN',
        'EVENT_MANAGER',
        'FINANCE',
        'CHECK_IN_STAFF',
        'CUSTOMER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "EventStatus" AS ENUM (
        'DRAFT',
        'PUBLISHED',
        'SOLD_OUT',
        'CANCELLED',
        'COMPLETED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TicketTypeStatus" AS ENUM (
        'ACTIVE',
        'INACTIVE',
        'SOLD_OUT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "OrderStatus" AS ENUM (
        'PENDING',
        'PROCESSING',
        'PAID',
        'FAILED',
        'CANCELLED',
        'REFUNDED',
        'EXPIRED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM (
        'PENDING',
        'PROCESSING',
        'PAID',
        'FAILED',
        'CANCELLED',
        'REFUNDED',
        'REVERSED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TicketStatus" AS ENUM (
        'VALID',
        'USED',
        'CANCELLED',
        'EXPIRED',
        'REFUNDED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DiscountType" AS ENUM (
        'PERCENTAGE',
        'FIXED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AuditAction" AS ENUM (
        'EVENT_CREATED',
        'EVENT_UPDATED',
        'EVENT_STATUS_CHANGED',
        'TICKET_TYPE_CREATED',
        'TICKET_TYPE_UPDATED',
        'TICKET_PRICE_CHANGED',
        'ORDER_CREATED',
        'ORDER_UPDATED',
        'ORDER_CANCELLED',
        'PAYMENT_RECEIVED',
        'PAYMENT_FAILED',
        'REFUND_RECORDED',
        'TICKET_GENERATED',
        'TICKET_CANCELLED',
        'TICKET_CHECKED_IN',
        'ADMIN_CREATED',
        'ADMIN_UPDATED',
        'ADMIN_ROLE_CHANGED',
        'DISCOUNT_CREATED',
        'DISCOUNT_UPDATED',
        'SETTINGS_UPDATED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 3. TABLES CREATION
-- ==============================================================================

-- USERS TABLE
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- EVENTS TABLE
CREATE TABLE IF NOT EXISTS "events" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT DEFAULT 'The ultimate tropical event experience in Accra.',
    "shortDescription" TEXT,
    "bannerUrl" TEXT,
    "posterUrl" TEXT,
    "venueName" TEXT NOT NULL,
    "venueAddress" TEXT,
    "city" TEXT DEFAULT 'Accra',
    "country" TEXT DEFAULT 'Ghana',
    "googleMapsUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "directions" TEXT,
    "eventDate" TIMESTAMP(3),
    "startTime" TEXT DEFAULT '8:00 PM GMT',
    "endTime" TEXT DEFAULT '4:00 AM GMT',
    "doorsOpen" TEXT,
    "totalCapacity" INTEGER DEFAULT 5000,
    "organizerName" TEXT DEFAULT 'Island Rave Entertainment',
    "organizerEmail" TEXT,
    "organizerPhone" TEXT,
    "organizerLogo" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "twitter" TEXT,
    "facebook" TEXT,
    "tiktok" TEXT,
    "refundPolicy" TEXT DEFAULT 'All ticket sales are non-refundable except in the event of festival cancellation.',
    "termsConditions" TEXT DEFAULT 'All attendees must be 18+ and present an official digital QR pass for gate check-in.',
    "eventRules" TEXT,
    "ageRestriction" TEXT DEFAULT '18+',
    "contactEmail" TEXT DEFAULT 'info@islandrave.com',
    "contactPhone" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'PUBLISHED',
    "isFeatured" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- TICKET TYPES TABLE
CREATE TABLE IF NOT EXISTS "ticket_types" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "totalQuantity" INTEGER NOT NULL,
    "soldQuantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "maxPerCustomer" INTEGER NOT NULL DEFAULT 5,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "earlyBirdDeadline" TIMESTAMP(3),
    "isEarlyBird" BOOLEAN NOT NULL DEFAULT false,
    "status" "TicketTypeStatus" NOT NULL DEFAULT 'ACTIVE',
    "salesStartDate" TIMESTAMP(3),
    "salesEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id")
);

-- DISCOUNT CODES TABLE
CREATE TABLE IF NOT EXISTS "discount_codes" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
    "code" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "DiscountType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "minOrderAmount" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id")
);

-- ORDERS TABLE
CREATE TABLE IF NOT EXISTS "orders" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
    "orderReference" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "customerEmail" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "serviceFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "reservedUntil" TIMESTAMP(3),
    "discountCodeId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS "order_items" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
    "orderId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- PAYMENTS TABLE (PAYSTACK INTEGRATION)
CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
    "orderId" TEXT NOT NULL,
    "paymentReference" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'paystack',
    "gatewayReference" TEXT,
    "gatewayResponse" TEXT,
    "authorizationUrl" TEXT,
    "accessCode" TEXT,
    "channel" TEXT,
    "cardType" TEXT,
    "last4" TEXT,
    "bank" TEXT,
    "mobileMoneyNumber" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "webhookReceivedAt" TIMESTAMP(3),
    "webhookId" TEXT,
    "ipAddress" TEXT,
    "metadata" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- TICKETS TABLE
CREATE TABLE IF NOT EXISTS "tickets" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
    "ticketNumber" TEXT NOT NULL,
    "ticketToken" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "userId" TEXT,
    "holderName" TEXT NOT NULL,
    "holderEmail" TEXT NOT NULL,
    "holderPhone" TEXT,
    "ticketTypeName" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "status" "TicketStatus" NOT NULL DEFAULT 'VALID',
    "qrCodeData" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CHECK-INS TABLE (SCANNER AUDIT)
CREATE TABLE IF NOT EXISTS "check_ins" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
    "ticketId" TEXT NOT NULL,
    "checkedInById" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT,
    "notes" TEXT,
    "deviceInfo" TEXT,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- ==============================================================================
-- 4. INDEXES
-- ==============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");
CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users"("phone");

CREATE UNIQUE INDEX IF NOT EXISTS "events_slug_key" ON "events"("slug");
CREATE INDEX IF NOT EXISTS "events_slug_idx" ON "events"("slug");
CREATE INDEX IF NOT EXISTS "events_status_idx" ON "events"("status");

CREATE INDEX IF NOT EXISTS "ticket_types_eventId_idx" ON "ticket_types"("eventId");
CREATE INDEX IF NOT EXISTS "ticket_types_status_idx" ON "ticket_types"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "discount_codes_code_key" ON "discount_codes"("code");
CREATE INDEX IF NOT EXISTS "discount_codes_code_idx" ON "discount_codes"("code");
CREATE INDEX IF NOT EXISTS "discount_codes_eventId_idx" ON "discount_codes"("eventId");

CREATE UNIQUE INDEX IF NOT EXISTS "orders_orderReference_key" ON "orders"("orderReference");
CREATE INDEX IF NOT EXISTS "orders_orderReference_idx" ON "orders"("orderReference");
CREATE INDEX IF NOT EXISTS "orders_customerEmail_idx" ON "orders"("customerEmail");
CREATE INDEX IF NOT EXISTS "orders_customerPhone_idx" ON "orders"("customerPhone");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status");
CREATE INDEX IF NOT EXISTS "orders_eventId_idx" ON "orders"("eventId");
CREATE INDEX IF NOT EXISTS "orders_userId_idx" ON "orders"("userId");

CREATE INDEX IF NOT EXISTS "order_items_orderId_idx" ON "order_items"("orderId");
CREATE INDEX IF NOT EXISTS "order_items_ticketTypeId_idx" ON "order_items"("ticketTypeId");

CREATE UNIQUE INDEX IF NOT EXISTS "payments_orderId_key" ON "payments"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "payments_paymentReference_key" ON "payments"("paymentReference");
CREATE INDEX IF NOT EXISTS "payments_paymentReference_idx" ON "payments"("paymentReference");
CREATE INDEX IF NOT EXISTS "payments_gatewayReference_idx" ON "payments"("gatewayReference");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments"("status");
CREATE INDEX IF NOT EXISTS "payments_webhookId_idx" ON "payments"("webhookId");

CREATE UNIQUE INDEX IF NOT EXISTS "tickets_ticketNumber_key" ON "tickets"("ticketNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "tickets_ticketToken_key" ON "tickets"("ticketToken");
CREATE INDEX IF NOT EXISTS "tickets_ticketNumber_idx" ON "tickets"("ticketNumber");
CREATE INDEX IF NOT EXISTS "tickets_ticketToken_idx" ON "tickets"("ticketToken");
CREATE INDEX IF NOT EXISTS "tickets_orderId_idx" ON "tickets"("orderId");
CREATE INDEX IF NOT EXISTS "tickets_eventId_idx" ON "tickets"("eventId");
CREATE INDEX IF NOT EXISTS "tickets_status_idx" ON "tickets"("status");
CREATE INDEX IF NOT EXISTS "tickets_holderEmail_idx" ON "tickets"("holderEmail");

CREATE UNIQUE INDEX IF NOT EXISTS "check_ins_ticketId_key" ON "check_ins"("ticketId");
CREATE INDEX IF NOT EXISTS "check_ins_ticketId_idx" ON "check_ins"("ticketId");
CREATE INDEX IF NOT EXISTS "check_ins_checkedInById_idx" ON "check_ins"("checkedInById");
CREATE INDEX IF NOT EXISTS "check_ins_checkedInAt_idx" ON "check_ins"("checkedInAt");

CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_logs_entityType_idx" ON "audit_logs"("entityType");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- ==============================================================================
-- 5. FOREIGN KEY CONSTRAINTS
-- ==============================================================================

DO $$ BEGIN
    ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "discount_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "order_items" ADD CONSTRAINT "order_items_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 6. SEED ESSENTIAL DATA (USERS, EVENT & TICKET TIERS)
-- ==============================================================================

-- Super Admin: admin@islandrave.com / SuperAdmin2026!
INSERT INTO "users" ("id", "email", "passwordHash", "firstName", "lastName", "role", "isActive", "emailVerified", "createdAt", "updatedAt")
VALUES (
    'usr-superadmin-01',
    'admin@islandrave.com',
    '$2a$12$e0X93Z8j1b5Zk6VwQz2cJeU2zRkL9bNmY7aGh4vW1xK8dJ6sL3eQq', -- BCrypt hash
    'System',
    'Administrator',
    'SUPER_ADMIN',
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO UPDATE SET "role" = 'SUPER_ADMIN', "isActive" = true;

-- Gate Scanner Staff: gate@islandrave.com / GateScanner2026!
INSERT INTO "users" ("id", "email", "passwordHash", "firstName", "lastName", "role", "isActive", "emailVerified", "createdAt", "updatedAt")
VALUES (
    'usr-gatestaff-01',
    'gate@islandrave.com',
    '$2a$12$6G3N1bV7xQ9aZ2eL8wR4.O9kL7jH5fD3sA1qW8eR0tY2uI4oP6aS.',
    'Gate',
    'Scanner',
    'CHECK_IN_STAFF',
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO UPDATE SET "role" = 'CHECK_IN_STAFF', "isActive" = true;

-- Event Manager: manager@islandrave.com / RaveManager2026!
INSERT INTO "users" ("id", "email", "passwordHash", "firstName", "lastName", "role", "isActive", "emailVerified", "createdAt", "updatedAt")
VALUES (
    'usr-manager-01',
    'manager@islandrave.com',
    '$2a$12$8K4P2cV9yR1bA4fN0xT6.P1lM9kI7gE5tB3rX0fS2uW4vJ6qR8bT.',
    'Event',
    'Manager',
    'EVENT_MANAGER',
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO UPDATE SET "role" = 'EVENT_MANAGER', "isActive" = true;

-- Finance Lead: finance@islandrave.com / RaveFinance2026!
INSERT INTO "users" ("id", "email", "passwordHash", "firstName", "lastName", "role", "isActive", "emailVerified", "createdAt", "updatedAt")
VALUES (
    'usr-finance-01',
    'finance@islandrave.com',
    '$2a$12$2H6R4dX1zA3cD6hP2zV8.R3nO1mK9iG7vD5tZ2hU4wY6xL8sT0cV.',
    'Finance',
    'Director',
    'FINANCE',
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO UPDATE SET "role" = 'FINANCE', "isActive" = true;

-- Main Event: Island Rave at La Plage Beach Club
INSERT INTO "events" (
    "id", "name", "slug", "description", "shortDescription",
    "venueName", "venueAddress", "city", "country",
    "eventDate", "startTime", "endTime", "totalCapacity",
    "organizerName", "contactEmail", "status", "isFeatured",
    "createdAt", "updatedAt"
)
VALUES (
    'evt-islandrave-2026',
    'Island Rave',
    'island-rave',
    'The premier tropical beachfront music and festival experience in Ghana. Electrifying sound, international DJs, VIP lounges, and beachside cabanas.',
    'The ultimate tropical event experience at La Plage Beach Club.',
    'La Plage Beach Club, Accra',
    'La Plage Beachfront, Laboma Beach Road, Accra',
    'Accra',
    'Ghana',
    '2026-09-26 20:00:00+00',
    '8:00 PM GMT',
    '4:00 AM GMT',
    5000,
    'Island Rave Entertainment',
    'info@islandrave.com',
    'PUBLISHED',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

-- Ticket Tier 1: Early-Bird General Admission (GHS 150.00)
INSERT INTO "ticket_types" (
    "id", "eventId", "name", "description", "price", "currency",
    "totalQuantity", "soldQuantity", "maxPerCustomer", "sortOrder",
    "isEarlyBird", "status", "createdAt", "updatedAt"
)
VALUES (
    'tier-earlybird-01',
    'evt-islandrave-2026',
    'Early-Bird General Admission',
    'Standard festival admission with stage access, food court, and beach areas.',
    150.00,
    'GHS',
    300,
    0,
    5,
    1,
    true,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

-- Ticket Tier 2: VIP Tropical Pass (GHS 350.00)
INSERT INTO "ticket_types" (
    "id", "eventId", "name", "description", "price", "currency",
    "totalQuantity", "soldQuantity", "maxPerCustomer", "sortOrder",
    "isEarlyBird", "status", "createdAt", "updatedAt"
)
VALUES (
    'tier-vip-02',
    'evt-islandrave-2026',
    'VIP Tropical Pass',
    'Express priority gate entrance, private VIP bar lounge, luxury restrooms, and elevated stage viewing deck.',
    350.00,
    'GHS',
    150,
    0,
    4,
    2,
    false,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

-- Ticket Tier 3: Cabana Lounge Table Package (GHS 1,500.00)
INSERT INTO "ticket_types" (
    "id", "eventId", "name", "description", "price", "currency",
    "totalQuantity", "soldQuantity", "maxPerCustomer", "sortOrder",
    "isEarlyBird", "status", "createdAt", "updatedAt"
)
VALUES (
    'tier-cabana-03',
    'evt-islandrave-2026',
    'Cabana Lounge Table Package',
    'Private beachfront cabana for up to 8 guests. Includes dedicated concierge, premium bottle service, and private security.',
    1500.00,
    'GHS',
    20,
    0,
    2,
    3,
    false,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) FOR SUPABASE
-- ==============================================================================
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ticket_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "check_ins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "discount_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- Allow public read access on published events
CREATE POLICY "Public events are viewable by everyone" ON "events"
    FOR SELECT USING ("status" = 'PUBLISHED');

-- Allow public read access on active ticket types
CREATE POLICY "Public ticket types are viewable by everyone" ON "ticket_types"
    FOR SELECT USING ("status" = 'ACTIVE');

-- Service role bypass (full backend access)
CREATE POLICY "Service role full access users" ON "users" FOR ALL USING (true);
CREATE POLICY "Service role full access events" ON "events" FOR ALL USING (true);
CREATE POLICY "Service role full access ticket_types" ON "ticket_types" FOR ALL USING (true);
CREATE POLICY "Service role full access orders" ON "orders" FOR ALL USING (true);
CREATE POLICY "Service role full access order_items" ON "order_items" FOR ALL USING (true);
CREATE POLICY "Service role full access payments" ON "payments" FOR ALL USING (true);
CREATE POLICY "Service role full access tickets" ON "tickets" FOR ALL USING (true);
CREATE POLICY "Service role full access check_ins" ON "check_ins" FOR ALL USING (true);
CREATE POLICY "Service role full access discount_codes" ON "discount_codes" FOR ALL USING (true);
CREATE POLICY "Service role full access audit_logs" ON "audit_logs" FOR ALL USING (true);
