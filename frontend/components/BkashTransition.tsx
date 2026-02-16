
import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';

interface BkashTransitionProps {
  amount: number;
}

const BkashTransition: React.FC<BkashTransitionProps> = ({ amount }) => {
  const [status, setStatus] = useState<'redirecting' | 'processing' | 'success'>('redirecting');

  useEffect(() => {
    const t1 = setTimeout(() => setStatus('processing'), 1500);
    const t2 = setTimeout(() => setStatus('success'), 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-[#e2136e]/95 z-[100] flex items-center justify-center text-white backdrop-blur-sm">
      <div className="max-w-md w-full p-8 text-center space-y-8">
        {/* bKash Logo Placeholder */}
        <div className="flex justify-center">
           <div className="bg-white p-4 rounded-2xl shadow-xl">
              <h1 className="text-4xl font-black text-[#e2136e]">bKash</h1>
           </div>
        </div>

        <div className="space-y-4">
          {status === 'redirecting' && (
            <div className="animate-in fade-in zoom-in duration-300">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
              <h2 className="text-2xl font-bold">Redirecting to bKash...</h2>
              <p className="opacity-70">Securing your connection to the gateway</p>
            </div>
          )}

          {status === 'processing' && (
            <div className="animate-in fade-in zoom-in duration-300">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
              <h2 className="text-2xl font-bold">Processing Payment</h2>
              <p className="opacity-70 tracking-widest uppercase text-xs font-bold">Amount: ৳ {amount}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="animate-in slide-in-from-bottom duration-500">
              <CheckCircle2 className="w-16 h-16 text-green-300 mx-auto mb-4" />
              <h2 className="text-3xl font-bold">Payment Successful</h2>
              <p className="opacity-70 mb-8">Transaction ID: BK-72215-XPZ</p>
              <div className="bg-white/10 p-4 rounded-xl border border-white/20 flex items-center justify-center gap-2">
                 <ShieldCheck className="w-5 h-5" />
                 <span className="text-sm font-medium">Auto-returning to Hall Portal...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BkashTransition;
