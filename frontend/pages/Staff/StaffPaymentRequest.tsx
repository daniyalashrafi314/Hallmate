
import React, { useState } from 'react';
import { useAppContext } from '../../App';
import { CreditCard, Users, DollarSign, Send, AlertCircle } from 'lucide-react';

const StaffPaymentRequest: React.FC = () => {
  const { theme } = useAppContext();
  const [targetYear, setTargetYear] = useState('');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className={`text-2xl font-bold ${theme.text}`}>Create Payment Obligation</h2>
        <p className="text-gray-500">Target specific batches or the entire hall for fee collection.</p>
      </div>

      <form onSubmit={handlePost} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-400 uppercase">Payment Title</label>
          <input 
            required
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Annual Picnic Fee 2024" 
            className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none transition-all font-medium" 
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase">Amount (BDT)</label>
            <div className="relative">
               <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <input 
                 required
                 type="number" 
                 value={amount}
                 onChange={(e) => setAmount(e.target.value)}
                 placeholder="500" 
                 className="w-full p-4 pl-10 bg-gray-50 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none transition-all font-medium" 
               />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase">Target Admission Year</label>
            <div className="relative">
               <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <input 
                 type="text" 
                 value={targetYear}
                 onChange={(e) => setTargetYear(e.target.value)}
                 placeholder="e.g., 23 (Blank for ALL)" 
                 className="w-full p-4 pl-10 bg-gray-50 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none transition-all font-medium" 
               />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
          <AlertCircle className="w-6 h-6 text-blue-500 shrink-0" />
          <p className="text-sm text-blue-800">
            Current logic: {targetYear ? `IDs starting with '${targetYear}' will be charged.` : "ALL hall residents will be charged."}
          </p>
        </div>

        <button 
          type="submit"
          disabled={isSuccess}
          className={`w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all ${
            isSuccess ? 'bg-green-500' : `${theme.primary} shadow-lg shadow-blue-900/20 hover:scale-[1.02]`
          }`}
        >
          {isSuccess ? (
            <>Obligations Posted Successfully!</>
          ) : (
            <><Send className="w-5 h-5" /> Dispatch Payment Request</>
          )}
        </button>
      </form>
    </div>
  );
};

export default StaffPaymentRequest;
