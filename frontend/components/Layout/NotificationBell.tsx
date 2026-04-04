import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCircle, Info, AlertCircle, DollarSign, Calendar, MessageSquare, Briefcase, Wallet } from 'lucide-react';
import { useAppContext } from '../../App';
import { UserRole } from '../../types';

type NotificationType = 'DONATION' | 'EVENT' | 'NOTICE' | 'PAYMENT' | 'COMPLAINT' | 'SEAT APPLICATION' | 'TASK' | 'SALARY';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  target_url: string;
  is_read: boolean | number | string; // Handle all Postgres boolean formats
  created_at: string;
}

const NotificationBell: React.FC = () => {
  const { userRole } = useAppContext();

  // Hide notifications for admin/provost and super user.
  if (userRole === UserRole.SUPER_USER || userRole === UserRole.PROVOST) {
    return null;
  }

  const apiEndpoint = userRole === UserRole.STUDENT
    ? 'http://localhost:5000/student/notifications'
    : userRole === UserRole.STAFF
      ? 'http://localhost:5000/staff/notifications'
      : null;

  if (!apiEndpoint) {
    return null;
  }

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const token = localStorage.getItem('hallmate_token');

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [userRole]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(apiEndpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  // Helper to safely check if read (handles Postgres 't', 'f', 1, 0, true, false)
  const isNotificationRead = (n: Notification) => {
    return n.is_read === true || n.is_read === 1 || n.is_read === 't';
  };

  const handleNotificationClick = async (notification: Notification) => {
    // 1. Mark as read in UI
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
    setIsOpen(false);
    
    // 2. Navigate to the target URL
    let routePath = notification.target_url;
    // Remove role-prefixes if they exist (e.g., /student/, /staff/)
    if (routePath.startsWith('/student/')) {
      routePath = routePath.replace('/student/', '/');
    } else if (routePath.startsWith('/staff/')) {
      routePath = routePath.replace('/staff/', '/');
    }
    
    console.log("Navigating to:", routePath);
    navigate(routePath);

    // 3. Update Backend
    try {
      await fetch(`${apiEndpoint}/${notification.id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error("Backend update failed", e);
    }
  };

  const markAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    
    try {
      await fetch(`${apiEndpoint}/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error("Backend update failed", e);
    }
  };

  // Use the new helper for robust counting
  const unreadCount = notifications.filter(n => !isNotificationRead(n)).length;

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'DONATION': return <DollarSign className="w-5 h-5 text-emerald-500" />;
      case 'EVENT': return <Calendar className="w-5 h-5 text-purple-500" />;
      case 'COMPLAINT': return <MessageSquare className="w-5 h-5 text-amber-500" />;
      case 'NOTICE': return <Info className="w-5 h-5 text-blue-500" />;
      case 'PAYMENT': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'SEAT APPLICATION': return <CheckCircle className="w-5 h-5 text-indigo-500" />;
      case 'TASK': return <Briefcase className="w-5 h-5 text-cyan-500" />;
      case 'SALARY': return <Wallet className="w-5 h-5 text-green-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="relative cursor-pointer hover:bg-gray-100 p-2 rounded-full transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        )}
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden flex flex-col max-h-[500px]">
          
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <h3 className="font-bold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 p-1 px-2 hover:bg-blue-50 rounded-lg transition-all"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-sm">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer flex gap-3 items-start ${
                      isNotificationRead(notification)
                        ? 'bg-white opacity-60 hover:bg-gray-50' 
                        : 'bg-blue-50/40 border-l-4 border-blue-500 hover:bg-blue-50'
                    }`}
                  >
                    <div className="mt-1 shrink-0">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-tight ${
                        isNotificationRead(notification) ? 'font-medium text-gray-600' : 'font-bold text-gray-900'
                      }`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-tighter">
                        {notification.created_at}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;