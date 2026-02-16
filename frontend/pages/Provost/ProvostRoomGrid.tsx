
import React, { useState } from 'react';
import { useAppContext } from '../../App';
import { Filter, Search, User, Check, AlertCircle } from 'lucide-react';

interface Seat {
  id: string;
  studentId: string | null;
}

interface Room {
  id: string;
  floor: number;
  seats: Seat[];
}

const ProvostRoomGrid: React.FC = () => {
  const { theme } = useAppContext();
  const [filter, setFilter] = useState('Empty'); // 'All', 'Empty', 'Floor 1', etc.
  
  // Mock data for 12 rooms
  const generateRooms = (): Room[] => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: `${301 + i}`,
      floor: Math.floor(i / 4) + 1,
      seats: [
        { id: 'A', studentId: Math.random() > 0.4 ? `2301${100 + i}` : null },
        { id: 'B', studentId: Math.random() > 0.4 ? `2301${200 + i}` : null },
        { id: 'C', studentId: Math.random() > 0.4 ? `2301${300 + i}` : null },
        { id: 'D', studentId: Math.random() > 0.4 ? `2301${400 + i}` : null },
      ]
    }));
  };

  const [rooms] = useState<Room[]>(generateRooms());

  const filteredRooms = rooms.filter(room => {
    if (filter === 'Empty') return room.seats.some(s => !s.studentId);
    if (filter.startsWith('Floor')) return room.floor === parseInt(filter.split(' ')[1]);
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${theme.text}`}>Room Occupancy Matrix</h2>
          <p className="text-gray-500">Real-time visualization of hall seats and resident mapping.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white border border-gray-200 rounded-lg flex items-center px-3 py-2 shadow-sm">
            <Filter className="w-4 h-4 text-gray-400 mr-2" />
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="bg-transparent text-sm outline-none font-medium text-gray-700"
            >
              <option value="Empty">Only with Vacancies</option>
              <option value="All">Show All Rooms</option>
              <option value="Floor 1">Floor 1</option>
              <option value="Floor 2">Floor 2</option>
              <option value="Floor 3">Floor 3</option>
            </select>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg flex items-center px-3 py-2 shadow-sm">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between">
            <span className="text-gray-400 text-xs font-bold uppercase">Total Seats</span>
            <span className="text-lg font-black text-gray-800">48</span>
         </div>
         <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between">
            <span className="text-gray-400 text-xs font-bold uppercase">Occupied</span>
            <span className="text-lg font-black text-amber-600">32</span>
         </div>
         <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between">
            <span className="text-gray-400 text-xs font-bold uppercase">Vacant</span>
            <span className="text-lg font-black text-green-600">16</span>
         </div>
         <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between">
            <span className="text-gray-400 text-xs font-bold uppercase">Maintenance</span>
            <span className="text-lg font-black text-red-600">0</span>
         </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRooms.map((room) => (
          <div key={room.id} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-50">
              <h3 className="text-2xl font-black text-gray-800 group-hover:text-blue-900 transition-colors">
                Room {room.id}
              </h3>
              <span className="px-2 py-1 bg-gray-100 text-gray-400 rounded-lg text-[10px] font-black tracking-widest uppercase">
                Floor {room.floor}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {room.seats.map((seat) => (
                <div 
                  key={seat.id}
                  className={`relative p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                    seat.studentId 
                      ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-inner' 
                      : 'bg-white border-dashed border-gray-200 text-gray-300 hover:border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  <span className="absolute top-1 left-2 text-[10px] font-black opacity-30">{seat.id}</span>
                  <User className={`w-6 h-6 ${seat.studentId ? 'opacity-100' : 'opacity-20'}`} />
                  <p className="text-[10px] font-bold truncate w-full text-center">
                    {seat.studentId || 'VACANT'}
                  </p>
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex justify-between items-center text-[10px] font-bold">
               <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  <span className="text-gray-400">Allocated</span>
               </div>
               <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-gray-200 border border-gray-300"></div>
                  <span className="text-gray-400">Empty</span>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProvostRoomGrid;
