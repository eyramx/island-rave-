import { PrismaClient } from '@prisma/client';

import { validateConfig } from './config';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

if (process.env.NODE_ENV === 'production') {
  const errors = validateConfig();
  if (errors.length) {
    throw new Error(`Production configuration errors: ${errors.join('; ')}`);
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

let dbReachabilityCache: { reachable: boolean; checkedAt: number } | null = null;

/**
 * Checks whether the PostgreSQL / Supabase database is connected and responding.
 * Uses a cached lightweight query (`SELECT 1`) with timeout to avoid blocking page requests.
 */
export async function isDbReachable(): Promise<boolean> {
  const now = Date.now();
  // Cache result for 15 seconds to minimize connection pool overhead
  if (dbReachabilityCache && now - dbReachabilityCache.checkedAt < 15000) {
    return dbReachabilityCache.reachable;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.includes('user:password@localhost')) {
    dbReachabilityCache = { reachable: false, checkedAt: now };
    return false;
  }

  try {
    const queryPromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('DB query timeout')), 2500)
    );

    await Promise.race([queryPromise, timeoutPromise]);
    dbReachabilityCache = { reachable: true, checkedAt: now };
    return true;
  } catch (error) {
    console.warn('Database reachability check failed (falling back to offline/mock data):', (error as Error).message);
    dbReachabilityCache = { reachable: false, checkedAt: now };
    return false;
  }
}

export default prisma;
