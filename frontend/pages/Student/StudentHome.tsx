import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Home, Megaphone, CheckCircle2, ChevronRight, Users, HeartHandshake, AlertCircle } from 'lucide-react';
import { BentoSkeleton } from '../../components/UI/Skeleton';
import { useAppContext } from '../../App';
import { format, parseISO } from 'date-fns';

// Define the interface for our new aggregated backend response
interface DashboardData {
  profile: { name: string; status: string; hall_name: string; provost: string; room_id: string | null; seat_number: number | null };
  payment: { title: string; amount: number; due_time: string; status: string } | null;
  visitor: { name: string; entry_time: string } | null;
  notice: { title: string; created_at: string; is_read: boolean } | null;
  donation: { description: string; start_date: string } | null;
  complaint: { type: string; status: string; date: string } | null;
}

const StudentHome: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch('http://localhost:5000/student/dashboard');
        if (response.ok) {
          setData(await response.json());
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading || !data) return <BentoSkeleton />;

  const { profile, payment, visitor, notice, donation, complaint } = data;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Welcome Header */}
      <div className="flex items-end gap-4">
        <h2 className={`text-3xl font-bold ${theme.text}`}>Welcome back, {(profile.name || 'Student').split(' ')[0]}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Box 1: Room Status (No redirect) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className={`p-3 rounded-xl ${theme.bg}`}>
              <Home className={`w-6 h-6 ${theme.text}`} />
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${profile.status === 'RESIDENT' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
              {profile.status}
            </span>
          </div>
          <div className="mt-4">
            {profile.status === 'RESIDENT' && profile.room_id ? (
              <>
                <p className="text-gray-500 text-sm font-medium">Room & Seat</p>
                <h3 className="text-2xl font-bold mt-1 text-gray-800">Room {profile.room_id} • Seat {profile.seat_number}</h3>
              </>
            ) : (
              <p className="text-gray-500 text-sm font-medium italic mt-2">You haven't been allocated a seat yet.</p>
            )}
            <p className="text-gray-400 text-xs mt-2 font-semibold">{profile.hall_name} • Provost: {profile.provost}</p>
          </div>
        </div>

        {/* Box 2: Payments */}
        <div 
          onClick={() => navigate('/payments')}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-xl bg-amber-50">
              <CreditCard className="w-6 h-6 text-amber-600" />
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="mt-4">
            {payment ? (
              <>
                <p className="text-gray-500 text-sm font-medium line-clamp-1">{payment.title}</p>
                <h3 className="text-2xl font-bold mt-1 text-gray-800">৳ {Number(payment.amount).toLocaleString()}</h3>
                <p className={`text-xs mt-1 font-semibold ${payment.status === 'Overdue' ? 'text-red-500 animate-pulse' : 'text-amber-600'}`}>
                  {payment.status}: {format(new Date(payment.due_time), 'MMM dd, yyyy')}
                </p>
              </>
            ) : (
              <p className="text-green-600 font-bold mt-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> No due payments!
              </p>
            )}
          </div>
        </div>

        {/* Box 3: Visitors */}
        <div 
          onClick={() => navigate('/visitors')}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-xl bg-purple-50">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="mt-4">
            {visitor ? (
              <>
                <p className="text-gray-500 text-sm font-medium">Expected Visitor</p>
                <h3 className="text-xl font-bold mt-1 text-gray-800 line-clamp-1">{visitor.name}</h3>
                <p className="text-purple-600 text-xs mt-1 font-semibold">
                  Arriving: {format(new Date(visitor.entry_time), 'MMM dd • hh:mm a')}
                </p>
              </>
            ) : (
              <p className="text-gray-500 font-medium mt-4 italic text-sm">No expected visitors.</p>
            )}
          </div>
        </div>

        {/* Box 4: Latest Notice (Wide) */}
        <div 
          onClick={() => navigate('/notices')}
          className={`col-span-1 md:col-span-2 p-6 rounded-2xl shadow-sm border cursor-pointer hover:shadow-md transition-all group relative overflow-hidden ${
            notice && !notice.is_read ? 'bg-white border-blue-200' : 'bg-gray-50/80 border-gray-100'
          }`}
        >
          {notice && !notice.is_read && (
            <div className="absolute top-6 right-6 w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          )}
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className={`w-5 h-5 ${notice && !notice.is_read ? theme.text : 'text-gray-400'}`} />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Latest Notice</span>
          </div>
          {notice ? (
            <>
              <h4 className={`text-lg font-bold pr-6 line-clamp-1 ${notice.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
                {notice.title}
              </h4>
              <p className="text-gray-500 mt-2 text-sm font-medium">
                Posted: {format(new Date(notice.created_at), 'PPP')}
              </p>
            </>
          ) : (
            <p className="text-gray-500 italic mt-2">No recent notices available.</p>
          )}
          <div className={`mt-4 flex items-center gap-1 text-sm font-bold ${theme.text} group-hover:underline`}>
             View Notice Board <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Box 5: Donations */}
        <div 
          onClick={() => navigate('/donations')}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-xl bg-pink-50">
              <HeartHandshake className="w-6 h-6 text-pink-500" />
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="mt-4">
            <p className="text-gray-500 text-sm font-medium mb-1">Active Donation</p>
            {donation ? (
              <h3 className="text-base font-bold text-gray-800 line-clamp-2 leading-snug">{donation.description}</h3>
            ) : (
              <p className="text-gray-500 italic text-sm">No active donation requests at the moment.</p>
            )}
          </div>
        </div>

        {/* Box 6: Latest Complaint */}
        <div 
          onClick={() => navigate('/complaints')}
          className="col-span-1 md:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <div className="p-3 rounded-xl bg-slate-50">
              <AlertCircle className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium flex items-center gap-2">
                My Recent Complaint
                {complaint && (
                   <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${
                     complaint.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 
                     complaint.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                   }`}>
                     {complaint.status}
                   </span>
                )}
              </p>
              {complaint ? (
                <h3 className="text-lg font-bold text-gray-800 mt-1">Issue regarding: {complaint.type}</h3>
              ) : (
                <p className="text-gray-500 italic text-sm mt-1">You haven't submitted any complaints.</p>
              )}
            </div>
          </div>
          <div className={`flex items-center gap-1 text-sm font-bold ${theme.text}`}>
             Complaint Center <ChevronRight className="w-4 h-4" />
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentHome;