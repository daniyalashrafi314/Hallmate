import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { Users, Plus, Clock, Phone, UserX, XCircle, Trash2 } from 'lucide-react';

interface Visitor {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  entry_time: string;
  exit_time: string;
}

const StudentVisitors: React.FC = () => {
  const { theme } = useAppContext();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentStatus, setStudentStatus] = useState<string>('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '', phone: '', relationship: '', entry_time: '', exit_time: ''
  });

  const API_BASE = 'http://localhost:5000/student/visitors';

  // --- API Calls ---
  const fetchStudentStatus = async () => {
    try {
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch('http://localhost:5000/student/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStudentStatus(data.status);
      }
    } catch (error) {
      console.error("Failed to fetch student status:", error);
    }
  };

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
    fetchStudentStatus();
    fetchVisitors();
  }, []);

  const handleAddVisitor = async (e: React.FormEvent) => {
    e.preventDefault();

    const entry = new Date(formData.entry_time);
    const exit = new Date(formData.exit_time);
    const now = new Date();

    if (entry >= exit) {
      alert("Error: Entry time must be before exit time.");
      return;
    }

    if (exit <= now) {
      alert("Error: You cannot enter a visit in the past.");
      return;
    }

    const duration = (exit.getTime() - entry.getTime()) / (1000 * 3600); // hours
    if (duration > 4) {
      alert("Error: Visit duration cannot exceed 4 hours.");
      return;
    }

    if (entry.getHours() < 6 || entry.getHours() > 21 || exit.getHours() < 6 || exit.getHours() > 21) {
      alert("Error: Visits are only allowed between 6 AM and 10 PM.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Submission failed");
      } else {
        setShowModal(false);
        setFormData({ name: '', phone: '', relationship: '', entry_time: '', exit_time: '' });
        await fetchVisitors(); // Refresh the list
      }

    } catch (error) {
      alert("Failed to add visitor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelVisitor = async (visitorId: string) => {
    if (!confirm("Are you sure you want to cancel this expected visitor?")) {
      return;
    }

    try {
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE}/${visitorId}/cancel`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (response.ok) {
        // Remove the cancelled visitor from the screen immediately
        setVisitors(visitors.filter(v => v.id !== visitorId));
      } else {
        alert("Failed to cancel visitor.");
      }
    } catch (error) {
      console.error("Error cancelling visitor");
      alert("Network error occurred.");
    }
  };

  const handleHideVisitor = async (id: string) => {
    try {
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE}/${id}/hide`, { 
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '#/login';
        return;
      }

      if (response.ok) {
        setVisitors(visitors.filter(v => v.id !== id));
      }
    } catch (error) {
      console.error("Failed to hide visitor");
    }
  };

  const handleClearLog = async () => {
    if (confirm("Are you sure you want to clear your visitor log? Staff will still have access to these records.")) {
      try {
        const token = localStorage.getItem('hallmate_token');
        const response = await fetch(`${API_BASE}/clear`, { 
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401 || response.status === 403) {
          window.location.href = '#/login';
          return;
        }

        if (response.ok) {
          setVisitors([]);
        }
      } catch (error) {
        console.error("Failed to clear log");
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h2 className={`text-2xl font-bold ${theme.text}`}>My Visitors</h2>
          <p className="text-gray-500">Log and manage your expected guests for hall security.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {visitors.length > 0 && (
            <button
              onClick={handleClearLog}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 font-bold transition-colors"
            >
              <Trash2 className="w-5 h-5" /> Clear Log
            </button>
          )}
          {studentStatus === 'RESIDENT' && (
            <button
              onClick={() => setShowModal(true)}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-bold ${theme.primary} shadow-md hover:shadow-lg transition-all`}
            >
              <Plus className="w-5 h-5" /> Expected Visitor
            </button>
          )}
        </div>
      </div>

      {/* Loading & Empty States */}
      {loading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div>
      ) : visitors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center">
          <Users className="w-12 h-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-bold text-gray-800">No Visitors Logged</h3>
          <p className="text-gray-500">
            {studentStatus === 'ATTACHED' 
              ? "Only resident students are allowed to have visitors in the hall." 
              : "Add an expected visitor to notify the hall gates."
            }
          </p>
        </div>
      ) :
        <div className="space-y-4">
          {visitors.map((visitor) => {
            // NEW LOGIC: A visit is "Expected/Active" as long as the current time is BEFORE the exit time
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

                    {/* Action Buttons Container */}
                    <div className="flex items-center gap-2">

                      {/* CANCEL: ONLY show if the visit is still Expected/Active */}
                      {isExpected && (
                        <button
                          onClick={() => handleCancelVisitor(visitor.id)}
                          className="flex items-center gap-1 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Cancel Visit
                        </button>
                      )}

                      {/* HIDE: ONLY show if the visit is securely in the Past */}
                      {!isExpected && (
                        <button
                          onClick={() => handleHideVisitor(visitor.id)}
                          className="flex items-center gap-1 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                          title="Remove from my view"
                        >
                          <UserX className="w-4 h-4" />
                          Hide
                        </button>
                      )}

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
      }

      {/* Add Visitor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">Add Expected Visitor</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleAddVisitor} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                  <input required type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Relationship</label>
                  <input required type="text" placeholder="e.g. Brother, Friend" value={formData.relationship} onChange={e => setFormData({ ...formData, relationship: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expected Entry Time</label>
                <input required type="datetime-local" value={formData.entry_time} onChange={e => setFormData({ ...formData, entry_time: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expected Exit Time</label>
                <input required type="datetime-local" value={formData.exit_time} onChange={e => setFormData({ ...formData, exit_time: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500" />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 mt-4 rounded-xl font-bold text-white transition-all ${isSubmitting ? 'bg-gray-400' : theme.primary}`}
              >
                {isSubmitting ? 'Adding...' : 'Confirm Visitor'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentVisitors;