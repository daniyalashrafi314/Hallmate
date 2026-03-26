
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { Users, Clock, Phone } from 'lucide-react';

interface Visitor {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  entry_time: string;
  exit_time: string;
}

const StaffVisitorLogs: React.FC = () => {
  const { theme } = useAppContext();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);

  const API_BASE = 'http://localhost:5000/staff/visitors';

  const fetchVisitors = async () => {
    try {
      const token = localStorage.getItem('hallmate_token');

      const response = await fetch(API_BASE, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login'; 
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setVisitors(data);
      }
    } catch (error) {
      console.error("Failed to fetch visitors:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, []);


  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h2 className={`text-2xl font-bold ${theme.text}`}>Student Visitors</h2>
          <p className="text-gray-500">View the expected and past guests for this student.</p>
        </div>
        {/* The Action Buttons (Clear Log, Add Visitor) have been removed from here */}
      </div>

      {/* Loading & Empty States */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : visitors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center">
          <Users className="w-12 h-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-bold text-gray-800">No Visitors Found</h3>
          <p className="text-gray-500">This student hasn't logged any expected guests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visitors.map((visitor) => {
            // Logic: A visit is "Expected/Active" as long as the current time is BEFORE the exit time
            const isExpected = new Date(visitor.exit_time) > new Date();

            return (
              <div key={visitor.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between gap-6 hover:shadow-md transition-shadow">
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        {visitor.name}
                        {!isExpected && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase tracking-wider">
                            Past Visit
                          </span>
                        )}
                      </h3>
                      <span className="inline-block px-2 py-1 mt-1 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider rounded">
                        {visitor.relationship}
                      </span>
                    </div>

                  </div>

                  {/* Time & Info Display */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {visitor.phone}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-800">In:</span> {visitor.entry_time}
                    </div>
                    {/* Empty div for grid spacing */}
                    <div className="hidden md:block"></div>
                    <div className="flex items-center gap-2 md:col-start-2">
                      <Clock className="w-4 h-4 text-gray-400 opacity-0" />
                      <span className="font-medium text-gray-800">Out:</span> {visitor.exit_time}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* The Add Visitor Modal has been completely removed from here */}
    </div>
  );
}

export default StaffVisitorLogs;
