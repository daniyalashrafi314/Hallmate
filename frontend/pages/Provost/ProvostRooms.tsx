import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { Filter, User, Check, AlertCircle, X, ChevronRight } from 'lucide-react';

interface Seat {
  seat_number: number;
  studentId: string | null;
}

interface Room {
  id: string;
  floor: number;
  capacity: number;
  seats: Seat[];
}

interface ApprovedStudent {
  student_id: string;
  name: string;
  priority_value: number;
}

const ProvostRooms: React.FC = () => {
  const { theme } = useAppContext();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filter, setFilter] = useState('Empty'); 
  const [loading, setLoading] = useState(true);

  // Interaction States
  const [selectedSeat, setSelectedSeat] = useState<{roomId: string, seatNumber: number, studentId: string | null} | null>(null);
  const [approvedStudents, setApprovedStudents] = useState<ApprovedStudent[]>([]);
  const [selectedStudentToAllocate, setSelectedStudentToAllocate] = useState('');

  const API_BASE = 'http://localhost:5000/admin';

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('hallmate_token');
      // Create a reusable headers object
      const authHeaders = { 'Authorization': `Bearer ${token}` };

      // Fetch Rooms
      const roomRes = await fetch(`${API_BASE}/rooms`, { headers: authHeaders });
      if (roomRes.status === 401 || roomRes.status === 403) {
        window.location.href = '#/login'; 
        return;
      }
      if (roomRes.ok) setRooms(await roomRes.json());
      
      // Fetch Approved Students
      const studentRes = await fetch(`${API_BASE}/approved-students`,{ headers: authHeaders,});
      if (studentRes.status === 401 || studentRes.status === 403) {
        window.location.href = '#/login'; 
        return;
      }
      if (studentRes.ok) setApprovedStudents(await studentRes.json());
      
    } catch (error) {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAllocate = async () => {
    if (!selectedSeat || !selectedStudentToAllocate) return;
    try {
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE}/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
         },
        body: JSON.stringify({ student_id: selectedStudentToAllocate, room_id: selectedSeat.roomId, seat_number: selectedSeat.seatNumber })
      });

      if(response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      setSelectedSeat(null);
      setSelectedStudentToAllocate('');
      fetchData(); // Refresh grid
    } catch (e) { alert("Allocation failed."); }
  };

  const handleDeallocate = async () => {
    if (!selectedSeat) return;
    try {
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE}/deallocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
         },
        body: JSON.stringify({ student_id: selectedSeat.studentId, room_id: selectedSeat.roomId, seat_number: selectedSeat.seatNumber })
      });

      if(response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      setSelectedSeat(null);
      fetchData(); // Refresh grid
    } catch (e) { alert("Deallocation failed."); }
  };

  // Sort: Highest vacancies first, then room number
  const filteredAndSortedRooms = rooms
    .filter(room => {
      if (filter === 'All') return true;
      if (filter === 'Empty') return room.seats.some(s => !s.studentId);
      if (filter.startsWith('Floor')) {
        const floor = parseInt(filter.split(' ')[1]);
        return room.floor === floor;
      }
      return true;
    })
    .sort((a, b) => {
      const aVacant = a.seats.filter(s => !s.studentId).length;
      const bVacant = b.seats.filter(s => !s.studentId).length;
      if (aVacant !== bVacant) return bVacant - aVacant;
      return parseInt(a.id) - parseInt(b.id);
    });

  // Calculate grid layout based on capacity
  const getGridCols = (capacity: number) => {
    if (capacity === 2) return 'grid-cols-2';
    if (capacity === 3) return 'grid-cols-3';
    return 'grid-cols-2'; // For 4 capacity, 2x2 grid looks best
  };

  const availableFloors = Array.from(new Set(rooms.map(r => r.floor))).sort();

  if (loading) return <div className="text-center py-10">Loading Room Matrix...</div>;

  return (
    <div className="space-y-6">
      
      {/* Header and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Seat Allocation</h2>
          <p className="text-gray-500 mt-1">Visually manage room capacities and assignments.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-gray-500 font-bold bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
            <Filter className="w-5 h-5" />
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="bg-transparent outline-none cursor-pointer"
            >
              <option value="Empty">Vacant Rooms First</option>
              <option value="All">All Rooms</option>
              {availableFloors.map(f => <option key={f} value={`Floor ${f}`}>Floor {f}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredAndSortedRooms.map(room => (
          <div key={room.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className={`px-4 py-3 border-b flex justify-between items-center ${
              room.seats.some(s => !s.studentId) ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'
            }`}>
              <h3 className="font-black text-gray-800 text-lg">Room {room.id}</h3>
              <span className="text-xs font-bold text-gray-500">Floor {room.floor} • Cap: {room.capacity}</span>
            </div>
            
            <div className="p-4">
              <div className={`grid gap-3 ${getGridCols(room.capacity)}`}>
                {room.seats.map((seat) => {
                  const isOccupied = !!seat.studentId;
                  
                  return (
                    <div 
                      key={seat.seat_number}
                      onClick={() => setSelectedSeat({roomId: room.id, seatNumber: seat.seat_number, studentId: seat.studentId})}
                      className={`relative p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer
                        ${isOccupied 
                          ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-inner hover:border-red-300 hover:bg-red-50' 
                          : 'bg-white border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-500'
                        }`}
                    >
                      <span className="absolute top-1.5 left-2 text-[10px] font-black opacity-30">S{seat.seat_number}</span>
                      <User className={`w-8 h-8 ${isOccupied ? 'opacity-100' : 'opacity-40'}`} />
                      <p className={`text-xs font-bold truncate w-full text-center ${!isOccupied && 'text-gray-400'}`}>
                        {seat.studentId || 'VACANT'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Modal Overlay */}
      {selectedSeat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">
                Room {selectedSeat.roomId} - Seat {selectedSeat.seatNumber}
              </h3>
              <button onClick={() => setSelectedSeat(null)} className="text-gray-400 hover:text-gray-600"><X /></button>
            </div>
            
            <div className="p-6">
              {/* IF OCCUPIED: Show Deallocation */}
              {selectedSeat.studentId ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8" />
                  </div>
                  <p className="text-gray-600 mb-6">This seat is currently assigned to <strong>{selectedSeat.studentId}</strong>.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setSelectedSeat(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Cancel</button>
                    <button onClick={handleDeallocate} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-900/20">Deallocate Seat</button>
                  </div>
                </div>
              ) : (
                /* IF VACANT: Show Allocation Pool */
                <div>
                  <div className="mb-4 flex items-center gap-2 text-blue-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <Check className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">Select a pre-approved student to fill this vacancy.</p>
                  </div>
                  
                  {approvedStudents.length === 0 ? (
                    <p className="text-gray-500 italic text-center py-4">No approved students currently waiting for seats.</p>
                  ) : (
                    <div className="space-y-4">
                      <label className="text-xs font-bold text-gray-500 uppercase">Approved Waitlist</label>
                      <select 
                        value={selectedStudentToAllocate} 
                        onChange={(e) => setSelectedStudentToAllocate(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-blue-500"
                      >
                        <option value="">-- Select Student --</option>
                        {approvedStudents.map(st => (
                          <option key={st.student_id} value={st.student_id}>
                            {st.name} ({st.student_id}) - Priority: {st.priority_value}
                          </option>
                        ))}
                      </select>
                      
                      <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <button onClick={() => setSelectedSeat(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Cancel</button>
                        <button 
                          onClick={handleAllocate}
                          disabled={!selectedStudentToAllocate}
                          className={`flex-1 py-3 font-bold rounded-xl text-white shadow-lg shadow-blue-900/20 transition-all ${
                            selectedStudentToAllocate ? theme.primary : 'bg-gray-300 cursor-not-allowed'
                          }`}
                        >
                          Confirm Allocation
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProvostRooms;