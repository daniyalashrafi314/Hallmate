import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import BkashTransition from '../../components/BkashTransition';
import { CreditCard, CheckCircle2, Clock, ShieldCheck, AlertTriangle, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Payment {
  id: number;
  title: string;
  amount: number;
  dueDate: string;
  status: 'Due' | 'Paid' | 'Overdue';
  paidAt: string | null;
}

const StudentPayments: React.FC = () => {
  const { theme } = useAppContext();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Payment Simulation State
  const [isPaying, setIsPaying] = useState(false);
  const [payingAmount, setPayingAmount] = useState(0);

  // --- NEW: Filter State ---
  // Defaults to 'all', meaning it resets on every page refresh!
  const [timeFilter, setTimeFilter] = useState<'all' | '1M' | '3M' | '1Y' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const API_BASE = 'http://localhost:5000/student/payments';

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('hallmate_token');

      const response = await fetch(API_BASE, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login'; 
        return;
      }

      if (response.ok) {
        setPayments(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handlePayment = (id: number, amount: number) => {
    setPayingAmount(amount);
    setIsPaying(true);
    
    setTimeout(async () => {
      try {
        const token = localStorage.getItem('hallmate_token');
        const response = await fetch(`${API_BASE}/${id}/pay`, { 
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401 || response.status === 403) {
          window.location.href = '#/login';
          return;
        }

        if (response.ok) {
          await fetchPayments(); // Assuming fetchPayments is already updated with Auth!
        }
      } catch (error) {
        alert("Payment processing failed.");
      } finally {
        setIsPaying(false);
      }
    }, 4000); 
  };

  // --- NEW: Filtering Logic ---
  const filteredPayments = payments.filter(p => {
    if (timeFilter === 'all') return true;

    // Determine the relevant date to check: 
    // If it's paid, check when it was paid. If it's due/overdue, check its due date.
    const relevantDate = (p.status === 'Paid' && p.paidAt) ? new Date(p.paidAt) : new Date(p.dueDate);
    const now = new Date();

    if (timeFilter === '1M') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      return relevantDate >= oneMonthAgo;
    }
    if (timeFilter === '3M') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      return relevantDate >= threeMonthsAgo;
    }
    if (timeFilter === '1Y') {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      return relevantDate >= oneYearAgo;
    }
    if (timeFilter === 'custom') {
      if (!customStart && !customEnd) return true;
      const start = customStart ? new Date(customStart) : new Date(0); // Beginning of time if no start
      const end = customEnd ? new Date(customEnd) : new Date('9999-12-31'); // End of time if no end
      end.setHours(23, 59, 59, 999); // Include the entire end day
      return relevantDate >= start && relevantDate <= end;
    }
    
    return true;
  });

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Paid': return { bg: 'bg-green-50', text: 'text-green-600', badge: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-6 h-6 text-green-600" /> };
      case 'Overdue': return { bg: 'bg-red-50', text: 'text-red-600', badge: 'bg-red-100 text-red-700 animate-pulse', icon: <AlertTriangle className="w-6 h-6 text-red-600" /> };
      default: return { bg: 'bg-yellow-50', text: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-6 h-6 text-yellow-600" /> };
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {isPaying && <BkashTransition amount={payingAmount} />}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h2 className={`text-2xl font-bold ${theme.text}`}>Payments & Dues</h2>
          <p className="text-gray-500">Track and pay your hall-related obligations via digital gateways.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 flex items-center gap-2 shadow-sm">
           <ShieldCheck className="w-5 h-5 text-blue-500" />
           <span className="text-sm font-bold text-gray-600">Secure Payments Enabled</span>
        </div>
      </div>

      {/* --- NEW: Filter UI Bar --- */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-2 text-gray-600 font-bold w-full md:w-auto">
          <Filter className="w-5 h-5" />
          <span className="text-sm">Filter:</span>
        </div>
        
        <select 
          value={timeFilter} 
          onChange={(e) => setTimeFilter(e.target.value as any)}
          className="w-full md:w-auto p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-gray-50 text-sm font-medium text-gray-700"
        >
          <option value="all">All Time</option>
          <option value="1M">Past 1 Month</option>
          <option value="3M">Past 3 Months</option>
          <option value="1Y">Past 1 Year</option>
          <option value="custom">Custom Range...</option>
        </select>

        {/* Show custom date pickers only if 'custom' is selected */}
        {timeFilter === 'custom' && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <input 
              type="date" 
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full md:w-auto p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-sm"
            />
            <span className="text-gray-400 font-bold">to</span>
            <input 
              type="date" 
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full md:w-auto p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-sm"
            />
          </div>
        )}
      </div>

      {/* --- RENDER LOGIC UPDATED TO USE filteredPayments --- */}
      {loading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div>
      ) : filteredPayments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500 font-medium">
          No payment records found for this time range.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPayments.map((p) => {
            const styles = getStatusStyles(p.status);
            
            return (
              <div key={p.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className={`p-4 rounded-xl ${styles.bg}`}>
                    {styles.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{p.title}</h4>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${styles.badge}`}>
                        {p.status}
                      </span>
                      {p.status === 'Paid' ? (
                        <p className="text-xs text-gray-500 font-medium">
                          Paid on {format(parseISO(p.paidAt!), 'MMM dd, yyyy - hh:mm a')}
                        </p>
                      ) : (
                        <p className={`text-xs font-bold ${p.status === 'Overdue' ? 'text-red-500' : 'text-gray-500'}`}>
                          Due: {format(parseISO(p.dueDate), 'PPP')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right w-full md:w-auto flex flex-row md:flex-col justify-between items-center md:items-end border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
                  <p className="text-xl font-black text-gray-900">৳ {Number(p.amount).toLocaleString()}</p>
                  
                  {(p.status === 'Due' || p.status === 'Overdue') ? (
                    <button 
                      onClick={() => handlePayment(p.id, p.amount)}
                      disabled={isPaying}
                      className={`mt-2 px-6 py-2 rounded-lg text-white text-sm font-bold ${theme.primary} shadow-lg shadow-blue-900/20 hover:opacity-90 transition-opacity`}
                    >
                      Pay Now
                    </button>
                  ) : (
                    <div className="mt-2 text-green-600 flex items-center gap-1 justify-end text-sm font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      Completed
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentPayments;