import React, { useState } from 'react';
import { useAppContext } from '../../App';
import { Bell, Calendar, FileText, Megaphone } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const StudentNotices: React.FC = () => {
  const { theme } = useAppContext();
  
  // Mock data mimicking the structure of your NOTICE table
  const [notices] = useState([
    { 
      id: '1', 
      title: 'Annual Sports Week Registration Starts Tomorrow', 
      description: 'All residents are invited to sign up for the cricket, football, and badminton tournaments. The registration link will be active at 10:00 AM on the portal. Please contact the sports secretary for equipment details.', 
      date: '2023-10-24T10:00:00Z', 
      category: 'Events',
      author: 'Provost Office',
      hasAttachment: true
    },
    { 
      id: '2', 
      title: 'Scheduled Maintenance: Dining Hall', 
      description: 'The main dining hall will be closed for deep cleaning and maintenance this Sunday from 9:00 AM to 4:00 PM. Alternative arrangements for lunch have been made at the south wing cafeteria. Normal operations will resume by dinner.', 
      date: '2023-10-22T08:30:00Z', 
      category: 'Facilities',
      author: 'Hall Administration',
      hasAttachment: false
    },
    { 
      id: '3', 
      title: 'Reminder: Monthly Utility Dues', 
      description: 'This is a gentle reminder that the monthly utility and mess dues for October are to be cleared by the 25th. Late payments will incur a daily fine as per the university rulebook. You can clear your dues via the Payments tab.', 
      date: '2023-10-15T14:15:00Z', 
      category: 'Finance',
      author: 'Accounts Section',
      hasAttachment: false
    }
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header Section */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className={`text-2xl font-bold ${theme.text}`}>Notice Board</h2>
          <p className="text-gray-500">Stay updated with the latest announcements and circulars.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 flex items-center gap-2 shadow-sm">
           <Bell className={`w-5 h-5 ${theme.text}`} />
           <span className="text-sm font-bold text-gray-600">3 New</span>
        </div>
      </div>

      {/* Notices List */}
      <div className="space-y-4">
        {notices.map((notice) => (
          <div 
            key={notice.id} 
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow group"
          >
            {/* Date Block (Hidden on very small screens, turns into a nice calendar square on desktop) */}
            <div className="hidden md:flex flex-col items-center justify-center bg-gray-50 rounded-xl p-4 min-w-[100px] border border-gray-100 group-hover:border-blue-100 transition-colors">
               <Calendar className="w-5 h-5 text-gray-400 mb-1" />
               <span className="text-2xl font-black text-gray-800">
                 {format(parseISO(notice.date), 'dd')}
               </span>
               <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                 {format(parseISO(notice.date), 'MMM')}
               </span>
            </div>

            {/* Content Block */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  {notice.category}
                </span>
                <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                  • Posted by {notice.author}
                </span>
                {/* Mobile Date Fallback */}
                <span className="md:hidden text-xs font-medium text-gray-400 flex items-center gap-1">
                  • {format(parseISO(notice.date), 'MMM dd')}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-2">{notice.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                {notice.description}
              </p>
              
              {/* Conditional Rendering: Only show button if there is a PDF attachment */}
              {notice.hasAttachment && (
                <button className={`flex items-center gap-1.5 text-sm font-bold ${theme.text} bg-blue-50/50 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors w-fit`}>
                  <FileText className="w-4 h-4" /> 
                  View PDF Circular
                </button>
              )}
            </div>
            
          </div>
        ))}
      </div>
      
    </div>
  );
};

export default StudentNotices;