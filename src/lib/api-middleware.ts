import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hasPermission, isAdmin } from './auth';
import { UserRole } from '@prisma/client';

// ============================================
// API Route Protection Middleware
// ============================================

interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
}

type RouteHandler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
  user: AuthenticatedUser
) => Promise<NextResponse>;

// Require authentication
export function withAuth(handler: RouteHandler) {
  return async (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => {
    const token = req.cookies.get('ir_session')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }
    
    return handler(req, ctx, payload);
  };
}

// Require admin role
export function withAdmin(handler: RouteHandler) {
  return withAuth(async (req, ctx, user) => {
    if (!isAdmin(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    return handler(req, ctx, user);
  });
}

// Require specific permission
export function withPermission(permission: string, handler: RouteHandler) {
  return withAuth(async (req, ctx, user) => {
    if (!hasPermission(user.role, permission)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    return handler(req, ctx, user);
  });
}

// Require specific roles
export function withRoles(roles: UserRole[], handler: RouteHandler) {
  return withAuth(async (req, ctx, user) => {
    if (!roles.includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    return handler(req, ctx, user);
  });
}

// ============================================
// API Response Helpers
// ============================================

export function apiSuccess(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function apiValidationError(errors: Record<string, string[]>) {
  return NextResponse.json({ success: false, error: 'Validation failed', errors }, { status: 422 });
}

// ============================================
// Rate Limiting (Simple in-memory)
// ============================================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (entry.count >= maxRequests) {
    return false;
  }
  
  entry.count++;
  return true;
}

// Clean up old entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 60000);
}
