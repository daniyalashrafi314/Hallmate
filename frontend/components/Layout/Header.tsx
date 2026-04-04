
import React from 'react';
import { Menu } from 'lucide-react';
import { useAppContext } from '../../App';
import { UserRole } from '../../types';
import { format } from 'date-fns';
import NotificationBell from './NotificationBell';

const Header: React.FC = () => {
  const { theme, userRole } = useAppContext();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-40">
      <div className="flex items-center gap-4 text-gray-400">
        <Menu className="md:hidden cursor-pointer text-gray-600" />
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden sm:block text-right">
          <p className="text-xs text-gray-500 font-medium">
            {format(new Date(), 'EEEE, MMMM do')}
          </p>
        </div>

        {userRole !== UserRole.SUPER_USER && <NotificationBell />}
        
      </div>
    </header>
  );
};

export default Header;
