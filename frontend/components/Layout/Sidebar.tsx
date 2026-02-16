
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Users, 
  CreditCard, 
  FileText, 
  ShieldCheck, 
  Grid, 
  Calendar,
  Layers,
  LogOut,
  UserCircle
} from 'lucide-react';
import { useAppContext } from '../../App';
import { UserRole } from '../../types';

const Sidebar: React.FC = () => {
  const { userRole, setUserRole, theme, user } = useAppContext();

  const navItems = {
    [UserRole.STUDENT]: [
      { to: '/dashboard', label: 'Dashboard', icon: Home },
      { to: '/residency', label: 'Residency App', icon: Layers },
      { to: '/payments', label: 'Payments', icon: CreditCard },
      { to: '/notices', label: 'Notices & Events', icon: Calendar },
    ],
    [UserRole.STAFF]: [
      { to: '/visitor-logs', label: 'Visitor Logs', icon: Users },
      { to: '/request-payment', label: 'Request Payment', icon: CreditCard },
      { to: '/notices-manage', label: 'Post Notice', icon: FileText },
    ],
    [UserRole.PROVOST]: [
      { to: '/users', label: 'User Management', icon: Users },
      { to: '/room-grid', label: 'Room Matrix', icon: Grid },
      { to: '/approvals', label: 'Residency Approvals', icon: ShieldCheck },
    ]
  };

  return (
    <aside className={`fixed top-0 left-0 h-full w-64 ${theme.primary} text-white z-50 transform -translate-x-full md:translate-x-0 transition-transform duration-300`}>
      <div className="p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-8 h-8" />
          UniHall
        </h1>
        <p className="text-xs opacity-60 mt-1 uppercase tracking-widest font-semibold">
          HMS Management
        </p>
      </div>

      <nav className="mt-8 px-4 space-y-2">
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
        {/* Role Switcher for Demo */}
        <div className="bg-white/5 p-3 rounded-lg">
          <label className="text-[10px] uppercase opacity-50 block mb-2 font-bold">Switch Role (Dev)</label>
          <select 
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as UserRole)}
            className="w-full bg-transparent text-sm outline-none cursor-pointer"
          >
            <option value={UserRole.STUDENT} className="text-black">Student View</option>
            <option value={UserRole.STAFF} className="text-black">Staff View</option>
            <option value={UserRole.PROVOST} className="text-black">Provost View</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <UserCircle className="w-6 h-6" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-[10px] opacity-60 uppercase">{userRole}</p>
          </div>
        </div>
        
        <button className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
