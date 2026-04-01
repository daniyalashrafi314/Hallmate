
import React from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { useAppContext } from '../../App';
import { format } from 'date-fns';

const Header: React.FC = () => {
  const { theme } = useAppContext();

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

        <div className="relative cursor-pointer hover:bg-gray-100 p-2 rounded-full transition-colors">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </div>
      </div>
    </header>
  );
};

export default Header;
