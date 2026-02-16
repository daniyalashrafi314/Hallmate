
import React, { useState } from 'react';
import { useAppContext } from '../../App';
import BkashTransition from '../../components/BkashTransition';
import { CreditCard, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const StudentPayments: React.FC = () => {
  const { theme } = useAppContext();
  const [isPaying, setIsPaying] = useState(false);
  const [payments, setPayments] = useState([
    { id: '1', title: 'Monthly Hall Utility Fee (Oct)', amount: 2450, dueDate: '2023-10-25', status: 'Due' },
    { id: '2', title: 'Library Membership Renewal', amount: 500, dueDate: '2023-09-15', status: 'Paid' },
    { id: '3', title: 'Hostel Security Deposit', amount: 5000, dueDate: '2023-08-01', status: 'Paid' },
  ]);

  const handlePayment = (id: string) => {
    setIsPaying(true);
    // Simulate payment logic after bKash transition
    setTimeout(() => {
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'Paid' as const } : p));
      setIsPaying(false);
    }, 5000); // 3s delay + result view in component
  };

  return (
    <div className="max-w-4xl mx-auto">
      {isPaying && <BkashTransition amount={2450} />}

      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className={`text-2xl font-bold ${theme.text}`}>Payments & Dues</h2>
          <p className="text-gray-500">Track and pay your hall-related obligations via digital gateways.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 flex items-center gap-2 shadow-sm">
           <ShieldCheck className="w-5 h-5 text-blue-500" />
           <span className="text-sm font-bold text-gray-600">Secure Payments Enabled</span>
        </div>
      </div>

      <div className="space-y-4">
        {payments.map((p) => (
          <div key={p.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-xl ${p.status === 'Paid' ? 'bg-green-50' : 'bg-red-50'}`}>
                <CreditCard className={`w-6 h-6 ${p.status === 'Paid' ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div>
                <h4 className="font-bold text-gray-800">{p.title}</h4>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Due: {format(parseISO(p.dueDate), 'PPP')}
                  </p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    p.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {p.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xl font-black text-gray-900">৳ {p.amount.toLocaleString()}</p>
              {p.status === 'Due' ? (
                <button 
                  onClick={() => handlePayment(p.id)}
                  className={`mt-2 px-6 py-2 rounded-lg text-white text-sm font-bold ${theme.primary} shadow-lg shadow-red-900/20`}
                >
                  Pay Now
                </button>
              ) : (
                <div className="mt-2 text-green-600 flex items-center gap-1 justify-end text-sm font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  Payment Success
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentPayments;
