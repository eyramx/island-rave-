import Link from 'next/link';

export default async function CheckoutFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const resolvedParams = await searchParams;
  const reference = resolvedParams.ref;

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="glass-panel p-8 md:p-12 rounded-3xl max-w-lg w-full text-center relative overflow-hidden border-red-500/30">
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-red-600 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-black mb-4 uppercase text-white">Payment Failed</h1>
          
          <p className="text-gray-300 mb-2">
            We couldn&apos;t process your payment. Your card has not been charged.
          </p>
          
          {reference && (
            <p className="text-sm text-gray-500 mb-8">
              Order Reference: <span className="text-white font-mono">{reference}</span>
            </p>
          )}
          
          <div className="flex flex-col gap-4">
            <Link 
              href="/checkout" 
              className="w-full bg-white text-black py-4 rounded-full font-bold hover:bg-gray-200 transition-colors"
            >
              Try Again
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
