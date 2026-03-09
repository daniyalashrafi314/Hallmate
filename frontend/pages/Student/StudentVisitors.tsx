import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { Users, Plus } from 'lucide-react'; // icons

const StudentVisitors: React.FC = () => {
  const { theme } = useAppContext();
  const [visitors, setVisitors] = useState([]);

  // You will add the useEffect fetch here later

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className={`text-2xl font-bold ${theme.text}`}>My Visitors</h2>
          <p className="text-gray-500">Log and manage your guests.</p>
        </div>
        <button className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-bold ${theme.primary}`}>
          <Plus className="w-5 h-5" /> Add Visitor
        </button>
      </div>

      {/* List of Visitors */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
         {/* Map over visitors here just like you did with payments */}
         <p className="text-gray-500 text-center py-8">No visitors logged yet.</p>
      </div>
    </div>
  );
};

export default StudentVisitors;