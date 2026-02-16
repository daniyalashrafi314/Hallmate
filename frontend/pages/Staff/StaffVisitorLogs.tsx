
import React, { useState } from 'react';
import { useAppContext } from '../../App';
import { Users, Clock, Calendar, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const StaffVisitorLogs: React.FC = () => {
  const { theme } = useAppContext();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const logs = [
    { id: 'v1', name: 'Kabir Ahmed', studentId: '230101', relation: 'Father', date: '2023-10-24', time: '10:30 AM', status: 'Checked In', phone: '+88017000000', purpose: 'Home visit/Collection' },
    { id: 'v2', name: 'Salma Khan', studentId: '230105', relation: 'Mother', date: '2023-10-24', time: '11:45 AM', status: 'Checked Out', phone: '+88018000000', purpose: 'Regular visit' },
    { id: 'v3', name: 'Tanvir Hossain', studentId: '230112', relation: 'Brother', date: '2023-10-23', time: '02:00 PM', status: 'Checked Out', phone: '+88019000000', purpose: 'Book delivery' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className={`text-2xl font-bold ${theme.text}`}>Daily Visitor Registry</h2>
          <p className="text-gray-500">Log and verify all external guests entering the premises.</p>
        </div>
        <div className="bg-white px-6 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
           <Calendar className="w-5 h-5 text-blue-500" />
           <span className="font-bold text-gray-700">{format(new Date(), 'dd MMMM, yyyy')}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        <div className="p-4 bg-gray-50/50 flex items-center font-black text-[10px] text-gray-400 uppercase tracking-widest">
           <div className="w-12">Status</div>
           <div className="flex-1 px-4">Visitor / Resident Mapping</div>
           <div className="w-32 text-center">Arrival</div>
           <div className="w-12"></div>
        </div>

        {logs.map((log) => (
          <div key={log.id} className="group">
            <div 
              onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
              className="p-4 flex items-center cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="w-12">
                 <div className={`w-3 h-3 rounded-full ${log.status === 'Checked In' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
              </div>
              <div className="flex-1 px-4 flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                    {log.name.charAt(0)}
                 </div>
                 <div>
                    <h4 className="font-bold text-gray-800">{log.name}</h4>
                    <p className="text-xs text-gray-400">Visiting: ID {log.studentId} • {log.relation}</p>
                 </div>
              </div>
              <div className="w-32 text-center">
                 <p className="text-sm font-bold text-gray-600">{log.time}</p>
                 <p className="text-[10px] text-gray-400 uppercase">{format(parseISO(log.date), 'MMM do')}</p>
              </div>
              <div className="w-12 text-center">
                 {expandedId === log.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </div>
            </div>

            {expandedId === log.id && (
              <div className="p-6 bg-gray-50 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-gray-400 uppercase">Contact Number</label>
                       <p className="font-medium text-gray-700">{log.phone}</p>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-gray-400 uppercase">Purpose of Visit</label>
                       <p className="font-medium text-gray-700">{log.purpose}</p>
                    </div>
                    <div className="flex items-end justify-end">
                       <button className="bg-white border-2 border-gray-200 px-4 py-1.5 rounded-lg text-xs font-bold text-gray-600 hover:border-red-200 hover:text-red-600 transition-all">
                         Mark Exit
                       </button>
                    </div>
                 </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StaffVisitorLogs;
