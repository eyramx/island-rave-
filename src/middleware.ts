import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-production');

interface SessionPayload {
  userId: string;
  email: string;
  role: string;
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get('ir_session')?.value;

  let userPayload: SessionPayload | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      userPayload = payload as unknown as SessionPayload;
    } catch {
      userPayload = null;
    }
  }

  // 1. Staff and Admin Login Pages: If already logged in, redirect to appropriate destination
  if (pathname === '/staff/login' || pathname === '/admin/login') {
    if (userPayload) {
      if (userPayload.role === 'CHECK_IN_STAFF') {
        return NextResponse.redirect(new URL('/admin/checkin', req.url));
      }
      if (userPayload.role === 'CUSTOMER') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      return NextResponse.redirect(new URL('/admin', req.url));
    }
    return NextResponse.next();
  }

  // 2. Staff Root Router (/staff): Routes to scanner, admin, or login
  if (pathname === '/staff') {
    if (!userPayload) {
      return NextResponse.redirect(new URL('/staff/login', req.url));
    }
    if (userPayload.role === 'CHECK_IN_STAFF') {
      return NextResponse.redirect(new URL('/admin/checkin', req.url));
    }
    if (userPayload.role === 'CUSTOMER') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.redirect(new URL('/admin', req.url));
  }

  // 3. Protected /admin Routes
  if (pathname.startsWith('/admin')) {
    if (!userPayload) {
      const loginUrl = new URL('/staff/login', req.url);
      loginUrl.searchParams.set('redirect', `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }

    const role = userPayload.role;

    // Customer accounts can never access admin routes
    if (role === 'CUSTOMER') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Role-based route authorization
    if (role === 'CHECK_IN_STAFF') {
      // Check-in staff only permitted on /admin/checkin and /admin/orders
      if (pathname !== '/admin/checkin' && pathname !== '/admin/orders') {
        return NextResponse.redirect(new URL('/admin/checkin', req.url));
      }
    }

    if (role === 'FINANCE') {
      // Finance only permitted on /admin (overview) and /admin/orders
      if (pathname === '/admin/checkin' || pathname === '/admin/tickets') {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
    }

    // SUPER_ADMIN and EVENT_MANAGER have full access
    return NextResponse.next();
  }

  // 4. Protected /api/admin Routes
  if (pathname.startsWith('/api/admin')) {
    // Whitelist login and logout endpoints
    if (pathname === '/api/admin/login' || pathname === '/api/admin/logout') {
      return NextResponse.next();
    }

    if (!userPayload) {
      return NextResponse.json(
        { error: 'Unauthorized. Valid staff session required.' },
        { status: 401 }
      );
    }

    const role = userPayload.role;
    if (role === 'CUSTOMER') {
      return NextResponse.json(
        { error: 'Forbidden. Customer accounts cannot access staff APIs.' },
        { status: 403 }
      );
    }

    // Guard ticket modifications (write operations restricted to SUPER_ADMIN & EVENT_MANAGER)
    if (pathname.startsWith('/api/admin/tickets') && req.method !== 'GET') {
      if (role !== 'SUPER_ADMIN' && role !== 'EVENT_MANAGER') {
        return NextResponse.json(
          { error: 'Forbidden. Only Super Admin or Event Manager can modify ticket tiers.' },
          { status: 403 }
        );
      }
    }

    // Guard complimentary order issuance (write operations restricted to SUPER_ADMIN & EVENT_MANAGER)
    if (pathname.startsWith('/api/admin/orders') && req.method !== 'GET') {
      if (role !== 'SUPER_ADMIN' && role !== 'EVENT_MANAGER') {
        return NextResponse.json(
          { error: 'Forbidden. Only Super Admin or Event Manager can issue complimentary tickets.' },
          { status: 403 }
        );
      }
    }

    // Guard stats endpoint (restricted from check-in staff)
    if (pathname.startsWith('/api/admin/stats')) {
      if (role === 'CHECK_IN_STAFF') {
        return NextResponse.json(
          { error: 'Forbidden. Check-in staff cannot access executive revenue statistics.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/staff',
    '/staff/:path*',
    '/api/admin',
    '/api/admin/:path*',
  ],
};
