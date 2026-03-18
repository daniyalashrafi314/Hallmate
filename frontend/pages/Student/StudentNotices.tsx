import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { Bell, Calendar, FileText, ChevronDown, ChevronUp, EyeOff, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Notice {
  id: number;
  title: string;
  description: string;
  author: string;
  date: string;
  hasAttachment: boolean;
  is_read: boolean;
}

const StudentNotices: React.FC = () => {
  const { theme } = useAppContext();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const API_BASE = 'http://localhost:5000/student/notices';

  const fetchNotices = async () => {
    try {
      const response = await fetch(API_BASE);
      if (response.ok) {
        setNotices(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch notices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotices(); }, []);

  const handleExpand = async (notice: Notice) => {
    // Toggle expand/collapse
    if (expandedId === notice.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(notice.id);

    // If it's unread, mark it as read in the DB and locally
    if (!notice.is_read) {
      try {
        await fetch(`${API_BASE}/${notice.id}/read`, { method: 'PUT' });
        setNotices(notices.map(n => n.id === notice.id ? { ...n, is_read: true } : n));
      } catch (error) {
        console.error("Failed to mark as read");
      }
    }
  };

  const handleHide = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Prevent the click from expanding the notice
    if (confirm("Hide this notice? You won't be able to see it again.")) {
      try {
        await fetch(`${API_BASE}/${id}/hide`, { method: 'PUT' });
        setNotices(notices.filter(n => n.id !== id));
      } catch (error) {
        console.error("Failed to hide notice");
      }
    }
  };

  const handleDownloadPDF = async (e: React.MouseEvent, id: number, title: string) => {
    e.stopPropagation(); // Prevent expansion
    try {
      const response = await fetch(`${API_BASE}/${id}/pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert("Failed to download PDF.");
      }
    } catch (error) {
      console.error("Error downloading PDF");
    }
  };

  const unreadCount = notices.filter(n => !n.is_read).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header Section */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className={`text-2xl font-bold ${theme.text}`}>Notice Board</h2>
          <p className="text-gray-500">Stay updated with the latest announcements.</p>
        </div>
        <div className={`px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm font-bold ${unreadCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-100 text-gray-500'} border`}>
           <Bell className="w-5 h-5" />
           <span className="text-sm">{unreadCount} Unread</span>
        </div>
      </div>

      {/* Notices List */}
      {loading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div>
      ) : notices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
          No active notices.
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => {
            const isExpanded = expandedId === notice.id;
            // Visual Styling: Unread notices have a pure white background and dark text. Read notices are slightly gray.
            const cardStyle = notice.is_read ? 'bg-gray-50/50 opacity-80' : 'bg-white shadow-sm hover:shadow-md';
            const titleStyle = notice.is_read ? 'text-gray-600 font-semibold' : 'text-gray-900 font-bold';

            return (
              <div 
                key={notice.id} 
                onClick={() => handleExpand(notice)}
                className={`p-6 rounded-2xl border border-gray-100 flex flex-col md:flex-row gap-6 transition-all cursor-pointer relative group ${cardStyle}`}
              >
                {/* Unread Indicator Dot */}
                {!notice.is_read && (
                  <div className="absolute top-6 left-3 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                )}

                {/* Date Block */}
                <div className="hidden md:flex flex-col items-center justify-center bg-white rounded-xl p-4 min-w-[100px] border border-gray-100 group-hover:border-blue-100 transition-colors">
                  <Calendar className="w-5 h-5 text-gray-400 mb-1" />
                  <span className="text-2xl font-black text-gray-800">
                    {format(parseISO(notice.date), 'dd')}
                  </span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    {format(parseISO(notice.date), 'MMM')}
                  </span>
                </div>

                {/* Content Block */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                        By {notice.author} • {format(parseISO(notice.date), 'MMM dd')}
                      </span>
                    </div>
                    
                    {/* Action Buttons (Hide) */}
                    <button 
                      onClick={(e) => handleHide(e, notice.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1"
                      title="Hide Notice"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <h3 className={`text-lg mb-2 pr-8 ${titleStyle}`}>{notice.title}</h3>
                  
                  {/* Description: Clamped to 2 lines when collapsed, full text when expanded */}
                  <div className={`text-gray-600 text-sm leading-relaxed mb-4 transition-all duration-300 ${isExpanded ? '' : 'line-clamp-2'}`}>
                    {notice.description}
                  </div>
                  
                  {/* Bottom Actions Row */}
                  <div className="flex items-center justify-between mt-4">
                    {notice.hasAttachment ? (
                      <button 
                        onClick={(e) => handleDownloadPDF(e, notice.id, notice.title)}
                        className={`flex items-center gap-1.5 text-sm font-bold ${theme.text} bg-blue-50/50 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors`}
                      >
                        <FileText className="w-4 h-4" /> Download PDF
                      </button>
                    ) : (
                      <div /> /* Empty div to push expand arrow to the right */
                    )}
                    
                    <div className="flex items-center gap-1 text-sm font-bold text-gray-400 group-hover:text-blue-500 transition-colors">
                      {isExpanded ? (
                        <><ChevronUp className="w-4 h-4" /> Show Less</>
                      ) : (
                        <><ChevronDown className="w-4 h-4" /> Read More</>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentNotices;