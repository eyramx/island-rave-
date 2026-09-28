'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StaffRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkStaffAuth() {
      try {
        const res = await fetch('/api/admin/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            if (data.user.role === 'CHECK_IN_STAFF') {
              router.replace('/admin/checkin');
              return;
            } else {
              router.replace('/admin');
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Staff auth check failed:', err);
      }
      router.replace('/staff/login');
    }

    checkStaffAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-rave-orange border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-gray-400 font-mono tracking-wider">Verifying Staff Authorization...</p>
      </div>
    </div>
  );
}
