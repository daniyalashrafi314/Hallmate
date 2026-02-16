
import React, { useEffect, useState } from 'react';
import { CreditCard, Home, Megaphone, CheckCircle2, ChevronRight } from 'lucide-react';
import { BentoSkeleton } from '../../components/UI/Skeleton';
import { useAppContext } from '../../App';
import { format, parseISO } from 'date-fns';

const StudentHome: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const { theme, user } = useAppContext();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <BentoSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4">
        <h2 className={`text-3xl font-bold ${theme.text}`}>Welcome back, {user?.name.split(' ')[0]}</h2>
        <span className="text-gray-500 mb-1 font-medium">Session 2023-24</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Room Status */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-1 md:col-span-2 flex flex-col justify-between group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className={`p-3 rounded-xl ${theme.bg}`}>
              <Home className={`w-6 h-6 ${theme.text}`} />
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">Active</span>
          </div>
          <div className="mt-4">
            <p className="text-gray-500 text-sm font-medium">Assigned Seat</p>
            <h3 className="text-3xl font-bold mt-1 text-gray-800">{user?.room}</h3>
            <p className="text-gray-400 text-xs mt-1">Fazlul Huq Muslim Hall • South Wing</p>
          </div>
        </div>

        {/* Next Payment */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className={`p-3 rounded-xl bg-amber-50 w-fit`}>
            <CreditCard className="w-6 h-6 text-amber-600" />
          </div>
          <div className="mt-4">
            <p className="text-gray-500 text-sm font-medium">Due Payment</p>
            <h3 className="text-2xl font-bold mt-1 text-gray-800">৳ 2,450</h3>
            <p className="text-red-500 text-xs mt-1 font-semibold flex items-center gap-1">
              Due: Oct 25, 2023
            </p>
          </div>
        </div>

        {/* Complaints Status */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className={`p-3 rounded-xl bg-blue-50 w-fit`}>
            <CheckCircle2 className="w-6 h-6 text-blue-600" />
          </div>
          <div className="mt-4">
            <p className="text-gray-500 text-sm font-medium">Complaints</p>
            <h3 className="text-2xl font-bold mt-1 text-gray-800">1 Resolved</h3>
            <p className="text-gray-400 text-xs mt-1">Last 30 days</p>
          </div>
        </div>

        {/* Latest Notice */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 md:col-span-3 hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className={`w-5 h-5 ${theme.text}`} />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Latest Notice</span>
            </div>
            <h4 className="text-lg font-bold text-gray-800">Annual Sports Week Registration Starts Tomorrow</h4>
            <p className="text-gray-600 mt-2 text-sm leading-relaxed">
              All residents are invited to sign up for the cricket, football, and badminton tournaments. The link will be active at 10:00 AM.
            </p>
            <button className={`mt-4 flex items-center gap-1 text-sm font-bold ${theme.text}`}>
              Read Full Notice <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="w-full md:w-48 h-32 md:h-auto bg-gray-100 rounded-xl overflow-hidden relative">
             <img src="https://picsum.photos/400/300?grayscale" alt="Notice" className="object-cover w-full h-full opacity-60" />
             <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 to-transparent"></div>
          </div>
        </div>

        {/* Quick Link */}
        <div className={`${theme.primary} p-6 rounded-2xl shadow-xl flex flex-col justify-center items-center text-center text-white cursor-pointer hover:scale-105 transition-transform`}>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-3">
            <Megaphone className="w-6 h-6" />
          </div>
          <p className="font-bold">Contact Office</p>
          <p className="text-[10px] opacity-70 mt-1">Direct support 24/7</p>
        </div>
      </div>
    </div>
  );
};

export default StudentHome;
