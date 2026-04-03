import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { MessageSquare, Plus, Trash2, Clock, CheckCircle, XCircle, Shield, AlertCircle, ThumbsUp, Globe, User, EyeOff } from 'lucide-react';

interface Complaint {
  id: number;
  type: string;
  description: string;
  status: 'Pending' | 'Resolved' | 'Dismissed';
  date: string;
  is_anonymous: boolean;
  is_public?: boolean;
  author_name?: string;
  upvotes: number;
  has_upvoted?: boolean;
}

const StudentComplaints: React.FC = () => {
  const { theme } = useAppContext();
  const [activeTab, setActiveTab] = useState<'public' | 'mine'>('public');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'Room',
    description: '',
    is_anonymous: false,
    is_public: true
  });

  const API_BASE = 'http://localhost:5000/student/complaints';

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE}?view=${activeTab}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) return window.location.href = '#/login';
      if (response.ok) setComplaints(await response.json());
    } catch (error) {
      console.error("Failed to fetch complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComplaints(); }, [activeTab]);

  const handleAddComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowModal(false);
        setFormData({ type: 'Room', description: '', is_anonymous: false, is_public: true });
        if (activeTab === (formData.is_public ? 'public' : 'mine')) {
          await fetchComplaints();
        } else {
          setActiveTab(formData.is_public ? 'public' : 'mine');
        }
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
        const token = localStorage.getItem('hallmate_token');
        const response = await fetch(`${API_BASE}/${id}`, {
          method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          setComplaints(complaints.filter(c => c.id !== id));
        } else alert("Cannot withdraw this complaint. It might already be processed.");
      } catch (error) { console.error("Failed to delete"); }
    }
  };

  const handleUpvote = async (id: number) => {
    try {
      const token = localStorage.getItem('hallmate_token');
      const response = await fetch(`${API_BASE}/${id}/upvote`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Optimistically update the UI
        setComplaints(prev => prev.map(c => {
          if (c.id === id) {
            return {
              ...c,
              has_upvoted: data.has_upvoted,
              upvotes: data.has_upvoted ? c.upvotes + 1 : c.upvotes - 1
            };
          }
          return c;
        }).sort((a, b) => b.upvotes - a.upvotes)); // Re-sort by upvotes
      }
    } catch (error) { console.error("Upvote failed"); }
  };

  const getStatusColor = (status: string) => {
    if (status === 'Resolved') return 'bg-green-100 text-green-700';
    if (status === 'Dismissed') return 'bg-gray-100 text-gray-700'; // Gray looks more neutral/professional than red
    return 'bg-amber-100 text-amber-700'; // Pending
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Hall Complaints</h2>
          <p className="text-gray-500 mt-1">Report issues, vote on public matters, and track your requests.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold transition-all shadow-md hover:shadow-lg ${theme.primary}`}
        >
          <Plus className="w-5 h-5" /> File Complaint
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('public')}
          className={`flex items-center gap-2 pb-4 px-4 font-bold transition-colors ${activeTab === 'public' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Globe className="w-5 h-5" /> Public Board
        </button>
        <button
          onClick={() => setActiveTab('mine')}
          className={`flex items-center gap-2 pb-4 px-4 font-bold transition-colors ${activeTab === 'mine' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <User className="w-5 h-5" /> My Complaints
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center">
          <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-bold text-gray-800">No Complaints Found</h3>
          <p className="text-gray-500">{activeTab === 'public' ? 'The public board is currently clear.' : 'You haven\'t reported any issues yet.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((complaint) => (
            <div key={complaint.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4">

              {/* Upvote Column (Only on Public Tab) */}
              {activeTab === 'public' && (
                <div className="flex flex-col items-center justify-start border-r border-gray-100 pr-4">
                  <button
                    onClick={() => handleUpvote(complaint.id)}
                    className={`p-2 rounded-lg transition-all ${complaint.has_upvoted ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                  >
                    <ThumbsUp className="w-6 h-6" fill={complaint.has_upvoted ? "currentColor" : "none"} />
                  </button>
                  <span className={`font-black mt-1 ${complaint.has_upvoted ? 'text-blue-600' : 'text-gray-500'}`}>
                    {complaint.upvotes}
                  </span>
                </div>
              )}

              {/* Content Column */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className="font-bold text-gray-800 uppercase tracking-wider text-xs bg-gray-100 border border-gray-200 px-3 py-1 rounded-md">
                    {complaint.type}
                  </span>

                  {/* Visibility/Anonymity Badges */}
                  {activeTab === 'mine' && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-md border ${complaint.is_public ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                      {complaint.is_public ? 'Public' : 'Private'}
                    </span>
                  )}
                  {complaint.is_anonymous && (
                    <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-md">
                      <Shield className="w-3 h-3" /> Anonymous
                    </span>
                  )}

                  <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {complaint.date}
                  </span>
                </div>

                <p className="text-gray-700 leading-relaxed">{complaint.description}</p>

                {/* Author Info (Public Tab Only) */}
                {activeTab === 'public' && (
                  <p className="text-sm font-medium text-gray-400 mt-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="w-3 h-3" />
                    </div>
                    {complaint.author_name}
                  </p>
                )}

                {/* Footer Action Row */}
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-50">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${getStatusColor(complaint.status)}`}>
                    {complaint.status === 'Resolved' ? <CheckCircle className="w-3.5 h-3.5" /> :
                      complaint.status === 'Dismissed' ? <XCircle className="w-3.5 h-3.5" /> :
                        <Clock className="w-3.5 h-3.5" />}
                    {complaint.status.toUpperCase()}
                  </div>

                  <div className="flex gap-4 items-center">
                    {activeTab === 'mine' && (
                      <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                        <ThumbsUp className="w-3.5 h-3.5" /> {complaint.upvotes} Votes
                      </span>
                    )}

                    {activeTab === 'mine' && complaint.status === 'Pending' && (
                      <button
                        onClick={() => handleDelete(complaint.id)}
                        className="text-gray-400 hover:text-red-500 flex items-center gap-1 text-xs font-bold transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> Withdraw
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">File a Complaint</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleAddComplaint} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Issue Category *</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="Room">Room / Furniture</option>
                    <option value="Dining">Dining</option>
                    <option value="Toilet">Toilet / Plumbing</option>
                    <option value="Facilities">Hall Facilities</option>
                    <option value="Staff">Staff Issue</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Visibility *</label>
                  <select
                    value={formData.is_public ? 'public' : 'private'}
                    onChange={e => setFormData({ ...formData, is_public: e.target.value === 'public' })}
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="public">Public (Board)</option>
                    <option value="private">Private (Admin Only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the issue clearly..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-start gap-3 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={formData.is_anonymous}
                  onChange={e => setFormData({ ...formData, is_anonymous: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded mt-0.5 focus:ring-indigo-500"
                />
                <label htmlFor="anonymous" className="cursor-pointer">
                  <span className="text-sm font-bold text-indigo-900 flex items-center gap-1">
                    <EyeOff className="w-4 h-4" /> Hide my identity
                  </span>
                  <span className="block text-xs text-indigo-700/70 mt-1">
                    Other students will see "Anonymous Resident". Admins can still process your request.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 mt-2 rounded-xl font-bold text-white transition-all shadow-md ${isSubmitting ? 'bg-gray-400' : theme.primary}`}
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