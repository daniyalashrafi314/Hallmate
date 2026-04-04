import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, Users, CreditCard, FileText, ShieldCheck, Grid, 
  Calendar, Layers, LogOut, UserCircle, ClipboardList, Heart, ListTodo, MessageSquare
} from 'lucide-react';
import { useAppContext } from '../../App';
import { UserRole } from '../../types';

const Sidebar: React.FC = () => {
  // 1. Pull the new logout function from Context
  const { userRole, theme, user, logout } = useAppContext();
  const navigate = useNavigate();

  // Safety check: if userRole is somehow null, don't crash
  if (!userRole) return null;

  const navItems = {
    [UserRole.STUDENT]: [
      { to: '/dashboard', label: 'Dashboard', icon: Home },
      { to: '/profile', label: 'Profile', icon: UserCircle },
      { to: '/seat-application', label: 'Seat Application', icon: Layers },
      { to: '/payments', label: 'Payments', icon: CreditCard },
      { to: '/notices', label: 'Notices & Events', icon: Calendar },
      { to: '/visitors', label: 'Visitors', icon: Users },
      { to: '/forum', label: 'Forum', icon: MessageSquare },
      { to: '/donations', label: 'Donations', icon: CreditCard },
      { to: '/complaints', label: 'Complaints', icon: FileText},
      { to: '/events', label: 'Events', icon: Calendar }
    ],
    [UserRole.STAFF]: [
      { to: '/dashboard', label: 'Dashboard', icon: Home },
      { to: '/profile', label: 'My Profile', icon: UserCircle },
      { to: '/visitors', label: 'Visitors', icon: Users },
      { to: '/notices-manage', label: 'Notices', icon: FileText },
      { to: '/forum', label: 'Forum', icon: MessageSquare },
      { to: '/tasks', label: 'Tasks', icon: ListTodo },
      { to: '/add-students', label: 'Students', icon: Users },
      { to: '/seat-applications', label: 'Seat Applications', icon: ClipboardList },
      { to: '/salary', label: 'Salary', icon: CreditCard },
      { to: '/add-payments', label: 'Add Payments', icon: CreditCard },
      { to: '/donations', label: 'Donations', icon: Heart },
      { to: '/events', label: 'Events', icon: Calendar }
    ],
    [UserRole.PROVOST]: [
      { to: '/dashboard', label: 'Dashboard', icon: Home },
      { to: '/profile', label: 'My Profile', icon: UserCircle },
      { to: '/forum', label: 'Forum', icon: MessageSquare },
      { to: '/tasks', label: 'Tasks', icon: ListTodo },
      { to: '/donations', label: 'Donations', icon: Heart },
      { to: '/complaints', label: 'Complaints', icon: FileText },
      { to: '/users', label: 'Staff Management', icon: Users },
      { to: '/students', label: 'Student Management', icon: Users },
      { to: '/rooms', label: 'Rooms', icon: Grid },
      { to: '/approvals', label: 'Seat Approvals', icon: ShieldCheck },
      { to: '/events', label: 'Events', icon: Calendar },
    ],
    [UserRole.SUPER_USER]: [
      { to: '/manage-provosts', label: 'Manage Provosts', icon: UserCircle },
    ]

  };

  // 2. The actual logout handler
  const handleSignOut = () => {
    logout(); // Clears context and localStorage
    navigate('/'); // Sends them to login screen
  };

  return (
    <aside className={`fixed top-0 left-0 h-full w-64 ${theme.primary} text-white z-50 transform -translate-x-full md:translate-x-0 transition-transform duration-300`}>
      <style>{`
        aside nav {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.05);
        }
        
        aside nav::-webkit-scrollbar {
          width: 8px;
        }
        
        aside nav::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        
        aside nav::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 10px;
          transition: background 0.2s;
        }
        
        aside nav::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
      <div className="p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-8 h-8" />
          UniHall
        </h1>
        <p className="text-xs opacity-60 mt-1 uppercase tracking-widest font-semibold">
          HMS Management
        </p>
      </div>

      <nav className="mt-8 px-4 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
        {navItems[userRole].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive 
                  ? `${theme.secondary} shadow-lg font-medium` 
                  : 'hover:bg-white/10'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="absolute bottom-0 left-0 w-full p-6 border-t border-white/10 space-y-4">
        {/* DEV SWITCHER REMOVED - Roles are now securely managed by backend tokens! */}

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <UserCircle className="w-6 h-6" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate">{user?.id}</p>
            <p className="text-[10px] opacity-60 uppercase">{userRole}</p>
          </div>
        </div>
        
        {/* 3. Wire up the onClick to our new handler */}
        <button 
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors w-full text-left"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;