import Link from 'next/link';

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; method?: string }>;
}) {
  const resolvedParams = await searchParams;
  const reference = resolvedParams.ref;
  const method = resolvedParams.method;

  const getMethodBadge = (m?: string) => {
    switch (m) {
      case 'mtn_momo':
        return { label: 'MTN Mobile Money (*170#)', icon: '📱', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' };
      case 'telecel_cash':
        return { label: 'Telecel Cash (*110#)', icon: '🔴', color: 'text-red-400 border-red-500/30 bg-red-500/10' };
      case 'at_money':
        return { label: 'AT Money Express', icon: '🔵', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' };
      case 'card':
        return { label: 'Bank Card (3D Secure)', icon: '💳', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' };
      case 'bank_transfer':
        return { label: 'GHIPSS Instant Bank Transfer', icon: '🏦', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
      default:
        return { label: 'Direct Mobile Payment', icon: '⚡', color: 'text-green-400 border-green-500/30 bg-green-500/10' };
    }
  };

  const badge = getMethodBadge(method);

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="glass-panel p-8 md:p-12 rounded-3xl max-w-lg w-full text-center relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-rave-orange rounded-full blur-[100px] opacity-30 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-black mb-3 uppercase tracking-tight text-white">Payment Successful</h1>
          
          <p className="text-gray-300 text-sm mb-4">
            Your admission tickets have been secured and a confirmation message is on its way.
          </p>

          {/* Payment Method Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-medium mb-6 backdrop-blur-md">
            <span>{badge.icon}</span>
            <span className="text-gray-300">Paid via <strong className="text-white">{badge.label}</strong></span>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </div>
          
          {reference && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-8 text-xs text-gray-400 font-mono">
              Order Reference: <span className="text-rave-orange font-bold font-mono">{reference}</span>
            </div>
          )}
          
          <div className="flex flex-col gap-3.5">
            <Link 
              href={reference ? `/dashboard?ref=${reference}&method=${method || 'mtn_momo'}` : '/dashboard'} 
              className="w-full bg-gradient-rave text-white py-4 rounded-full font-bold shadow-[0_0_20px_rgba(249,115,22,0.35)] hover:scale-[1.02] transition-transform"
            >
              Access My Digital QR Tickets
            </Link>
            
            <Link 
              href="/" 
              className="w-full bg-white/10 text-white py-3.5 rounded-full font-bold hover:bg-white/20 transition-colors text-sm"
            >
              Return to Event Overview
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
