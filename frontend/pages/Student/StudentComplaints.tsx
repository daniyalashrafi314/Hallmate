import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { MessageSquare, Plus, Trash2, Clock, CheckCircle, XCircle, Shield, AlertCircle } from 'lucide-react';

interface Complaint {
  id: number;
  type: string;
  description: string;
  status: 'Pending' | 'Approved' | 'Refused';
  date: string;
  is_anonymous: boolean;
}

const StudentComplaints: React.FC = () => {
  const { theme } = useAppContext();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'Room',
    description: '',
    is_anonymous: false
  });

  const API_BASE = 'http://localhost:5000/student/complaints';

  const fetchComplaints = async () => {
    try {
      const response = await fetch(API_BASE);
      if (response.ok) {
        setComplaints(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComplaints(); }, []);

  const handleAddComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setShowModal(false);
        setFormData({ type: 'Room', description: '', is_anonymous: false });
        await fetchComplaints();
      } else {
        alert("Failed to file complaint");
      }
    } catch (error) {
      alert("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to withdraw this complaint?")) {
      try {
        const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
        if (response.ok) {
          setComplaints(complaints.filter(c => c.id !== id));
        } else {
          alert("Cannot delete this complaint. It might already be processed.");
        }
      } catch (error) {
        console.error("Failed to delete complaint");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-700';
      case 'Refused': return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle className="w-4 h-4" />;
      case 'Refused': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h2 className={`text-2xl font-bold ${theme.text}`}>My Complaints</h2>
          <p className="text-gray-500">Report issues securely to the hall administration.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-bold ${theme.primary} shadow-md hover:shadow-lg transition-all`}
        >
          <Plus className="w-5 h-5" /> File Complaint
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center">
          <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-bold text-gray-800">No Complaints Filed</h3>
          <p className="text-gray-500">You haven't reported any issues yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((complaint) => (
            <div key={complaint.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 relative">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold text-gray-800 uppercase tracking-wider text-sm bg-gray-100 px-3 py-1 rounded-full">
                    {complaint.type}
                  </span>
                  {complaint.is_anonymous && (
                    <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                      <Shield className="w-3 h-3" /> Anonymous
                    </span>
                  )}
                  <span className="text-sm text-gray-400 ml-auto">{complaint.date}</span>
                </div>
                <p className="text-gray-600 mt-3">{complaint.description}</p>
                
                <div className="flex items-center justify-between mt-6">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-bold ${getStatusColor(complaint.status)}`}>
                    {getStatusIcon(complaint.status)} {complaint.status}
                  </div>
                  
                  {complaint.status === 'Pending' && (
                    <button 
                      onClick={() => handleDelete(complaint.id)}
                      className="text-gray-400 hover:text-red-500 flex items-center gap-1 text-sm font-bold transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Withdraw
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">File a Complaint</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleAddComplaint} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Issue Category *</label>
                <select 
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-white"
                >
                  <option value="Room">Room / Furniture</option>
                  <option value="Dining">Dining</option>
                  <option value="Toilet">Toilet / Plumbing</option>
                  <option value="Roommate">Roommate Issue</option>
                  <option value="Staff">Staff Issue</option>
                  <option value="Facilities">Hall Facilities</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description *</label>
                <textarea 
                  required 
                  rows={4}
                  placeholder="Please describe the issue in detail..."
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 resize-none" 
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <input 
                  type="checkbox" 
                  id="anonymous"
                  checked={formData.is_anonymous}
                  onChange={e => setFormData({...formData, is_anonymous: e.target.checked})}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="anonymous" className="text-sm font-medium text-indigo-900 cursor-pointer">
                  Submit Anonymously
                </label>
              </div>
              <p className="text-xs text-gray-500 px-1 flex items-start gap-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Staff will not see your name, but you can still track the status of this complaint here.
              </p>
              
              <button 
                type="submit" 
                disabled={isSubmitting}
                className={`w-full py-3 mt-4 rounded-xl font-bold text-white transition-all ${isSubmitting ? 'bg-gray-400' : theme.primary}`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentComplaints;