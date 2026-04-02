import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { Filter, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

interface Application {
  application_id: number;
  student_id: string;
  name: string;
  phone_number: string;
  department: string;
  batch_year: number;
  description: string;
  status: 'Pending' | 'Approved' | 'Refused';
  priority_value: number | null;
  date: string;
}

const ProvostSeatApprovals: React.FC = () => {
  const { theme } = useAppContext();
  const [applications, setApplications] = useState<Application[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterDept, setFilterDept] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  const API_BASE = 'http://localhost:5000/admin';

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('hallmate_token');
      const authHeaders = { 'Authorization': `Bearer ${token}` };

      const res = await fetch(`${API_BASE}/seat-approvals`, { headers: authHeaders });
      
      if (res.status === 401 || res.status === 403) {
        window.location.href = '#/login'; 
        return;
      }
      
      if (res.ok) {
        setApplications(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch applications", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const handleStatusChange = async (appId: number, newStatus: 'Approved' | 'Refused') => {
    try {
      const token = localStorage.getItem('hallmate_token');
      const authHeaders = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      };

      const res = await fetch(`${API_BASE}/seat-approvals/${appId}/status`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ status: newStatus })
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = '#/login'; 
        return;
      }

      if (res.ok) {
        // Update local state instantly so the user doesn't have to wait for a refresh
        setApplications(prev => prev.map(app => 
          app.application_id === appId ? { ...app, status: newStatus } : app
        ));
        setExpandedId(null); 
      } else {
        alert("Failed to update status. Please try again.");
      }
    } catch (error) {
      alert("Network error. Please try again.");
    }
  };

  const departments = ['All', ...Array.from(new Set(applications.map(a => a.department)))];

  const filteredApps = filterDept === 'All' 
    ? applications 
    : applications.filter(a => a.department === filterDept);

  const getStatusIcon = (status: string) => {
    if (status === 'Pending') return <Clock className="w-6 h-6 text-yellow-500" />;
    if (status === 'Approved') return <CheckCircle className="w-6 h-6 text-green-500" />;
    return <XCircle className="w-6 h-6 text-red-500" />;
  };

  if (loading) return <div className="text-center py-10">Loading Applications...</div>;

  return (
    <div className="space-y-6">
      
      {/* Header and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Seat Approvals</h2>
          <p className="text-gray-500 mt-1">Review and manage student requests for hall accommodation.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-gray-500 font-bold bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
            <Filter className="w-5 h-5" />
            <select 
              value={filterDept} 
              onChange={(e) => setFilterDept(e.target.value)}
              className="bg-transparent outline-none cursor-pointer max-w-[200px] truncate"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* List View */}
      <div className="space-y-4">
        {filteredApps.map((app) => (
          <div key={app.application_id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            
            {/* Clickable Header */}
            <div 
              className={`flex items-center justify-between p-5 cursor-pointer transition-colors ${
                app.status === 'Pending' ? 'bg-amber-50/30' : 'bg-gray-50/50'
              }`}
              onClick={() => setExpandedId(expandedId === app.application_id ? null : app.application_id)}
            >
              <div className="flex items-center gap-4 w-1/3">
                {getStatusIcon(app.status)}
                <div>
                  <h3 className="font-black text-gray-800 text-lg">{app.name}</h3>
                  <p className="text-sm font-bold text-gray-500">{app.student_id}</p>
                </div>
              </div>
              
              <div className="w-1/4 text-sm text-gray-600">
                <p>Priority: <span className="font-bold text-gray-800">{app.priority_value || 'N/A'}</span></p>
                <p>Batch: <span className="font-bold text-gray-800">{app.batch_year}</span></p>
              </div>

              <div className="w-1/3 text-sm font-medium text-gray-600 text-right pr-4">
                <p className="truncate">{app.department}</p>
              </div>

              <div className="p-2 bg-white rounded-full shadow-sm border border-gray-100">
                {expandedId === app.application_id ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
              </div>
            </div>

            {/* Expanded Formal Application View */}
            {expandedId === app.application_id && (
              <div className="p-6 bg-white border-t border-gray-100">
                <div className="max-w-4xl mx-auto bg-gray-50 p-8 border border-gray-200 shadow-inner rounded-2xl">
                  <h2 className="text-2xl font-black text-center mb-6 border-b border-gray-200 pb-4 text-gray-800">
                    Formal Seat Application
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-y-4 mb-8 text-sm">
                    <p><span className="font-bold text-gray-500 uppercase text-xs block mb-1">Applicant Name</span> <span className="font-semibold text-base">{app.name}</span></p>
                    <p><span className="font-bold text-gray-500 uppercase text-xs block mb-1">Student ID</span> <span className="font-semibold text-base">{app.student_id}</span></p>
                    <p><span className="font-bold text-gray-500 uppercase text-xs block mb-1">Department</span> <span className="font-semibold text-base">{app.department}</span></p>
                    <p><span className="font-bold text-gray-500 uppercase text-xs block mb-1">Batch Year</span> <span className="font-semibold text-base">{app.batch_year}</span></p>
                    <p><span className="font-bold text-gray-500 uppercase text-xs block mb-1">Phone Number</span> <span className="font-semibold text-base">{app.phone_number}</span></p>
                    <p><span className="font-bold text-gray-500 uppercase text-xs block mb-1">Date Submitted</span> <span className="font-semibold text-base">{new Date(app.date).toLocaleDateString()}</span></p>
                  </div>

                  <div className="mb-8">
                    <p className="font-bold text-gray-500 uppercase text-xs block mb-2">Reason for Application</p>
                    <div className="p-5 bg-white border border-gray-200 rounded-xl text-gray-700 italic min-h-[100px] whitespace-pre-wrap shadow-sm">
                      "{app.description}"
                    </div>
                  </div>

                  {/* Action Buttons (Only show if Pending) */}
                  {app.status === 'Pending' ? (
                    <div className="flex gap-4 mt-6 border-t border-gray-200 pt-6">
                      <button 
                        onClick={() => handleStatusChange(app.application_id, 'Refused')}
                        className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 border border-red-200 transition-all"
                      >
                        Refuse Application
                      </button>
                      <button 
                        onClick={() => handleStatusChange(app.application_id, 'Approved')}
                        className={`flex-1 py-3 font-bold rounded-xl text-white shadow-lg transition-all ${theme.primary} shadow-blue-900/20`}
                      >
                        Approve Application
                      </button>
                    </div>
                  ) : (
                    <div className="text-center mt-6 border-t border-gray-200 pt-6">
                      <span className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold ${
                        app.status === 'Approved' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {getStatusIcon(app.status)} Application {app.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredApps.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="font-semibold">No applications found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProvostSeatApprovals;